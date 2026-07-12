import { describe, expect, it } from 'vitest';

import {
  extractYouTubeVideoId,
  fetchYouTubeTranscriptFromSources,
  orderYouTubeCaptionTracks,
  parseYouTubeJson3,
} from './youtube-transcript';

describe('YouTube transcript extraction', () => {
  it.each([
    ['https://www.youtube.com/watch?v=watch-id', 'watch-id'],
    ['https://m.youtube.com/shorts/short-id', 'short-id'],
    ['https://youtube.com/live/live-id', 'live-id'],
    ['https://www.youtube.com/embed/embed-id', 'embed-id'],
    ['https://youtu.be/brief-id?t=3', 'brief-id'],
  ])('extracts supported video URL %s', (url, expected) => {
    expect(extractYouTubeVideoId(url)).toBe(expected);
  });

  it.each(['https://notyoutube.com/watch?v=bad', 'https://youtube.com.evil.test/watch?v=bad', 'bad']) (
    'rejects invalid URL %s',
    (url) => expect(extractYouTubeVideoId(url)).toBeNull(),
  );

  it('orders preferred, English, and other tracks with manual before ASR', () => {
    const tracks = [
      { baseUrl: 'other-asr', languageCode: 'fr', kind: 'asr' },
      { baseUrl: 'en-asr', languageCode: 'en', kind: 'asr' },
      { baseUrl: 'preferred-asr', languageCode: 'zh-Hans', kind: 'asr' },
      { baseUrl: 'other-manual', languageCode: 'fr' },
      { baseUrl: 'en-manual', languageCode: 'en-US' },
      { baseUrl: 'preferred-manual', languageCode: 'zh' },
    ];

    expect(orderYouTubeCaptionTracks(tracks, 'zh-CN').map((track) => track.baseUrl)).toEqual([
      'preferred-manual',
      'preferred-asr',
      'en-manual',
      'en-asr',
      'other-manual',
      'other-asr',
    ]);
  });

  it('normalizes JSON3 millisecond events to non-empty second-based segments', () => {
    expect(
      parseYouTubeJson3({
        events: [
          { tStartMs: 1000, dDurationMs: 2500, segs: [{ utf8: 'Hello' }, { utf8: '\nworld' }] },
          { tStartMs: 4000, dDurationMs: 500, segs: [{ utf8: '  ' }] },
          { tStartMs: 5000, segs: [{ utf8: 'Again' }] },
        ],
      }),
    ).toEqual([
      { text: 'Hello world', start: 1, duration: 2.5 },
      { text: 'Again', start: 5, duration: 0 },
    ]);
  });

  it('falls back from iOS to Android tracks and requests JSON3', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.includes('/youtubei/v1/player')) {
        const client = JSON.parse(String(init?.body)).context.client.clientName;
        return Response.json(
          client === 'IOS'
            ? {}
            : {
                captions: {
                  playerCaptionsTracklistRenderer: {
                    captionTracks: [{ baseUrl: 'https://captions.test/android', languageCode: 'en' }],
                  },
                },
              },
        );
      }
      if (url.startsWith('https://captions.test/android')) {
        return Response.json({ events: [{ tStartMs: 12, dDurationMs: 34, segs: [{ utf8: 'Works' }] }] });
      }
      return new Response('', { status: 404 });
    };

    await expect(fetchYouTubeTranscriptFromSources('video', 'en', fetchImpl)).resolves.toEqual({
      text: 'Works',
      segments: [{ text: 'Works', start: 0.012, duration: 0.034 }],
      language: 'en',
    });
    expect(calls.map(({ url }) => url)).toEqual([
      'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
      'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
      'https://captions.test/android?fmt=json3',
    ]);
  });

  it('falls back to watch-page caption tracks', async () => {
    let playerCalls = 0;
    const fetchImpl = async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/youtubei/v1/player')) {
        playerCalls++;
        return Response.json({});
      }
      if (url.includes('/watch?')) {
        return new Response('<script>var x={"captionTracks":[{"baseUrl":"https://captions.test/page","languageCode":"fr"}]};</script>');
      }
      if (url.startsWith('https://captions.test/page')) {
        return Response.json({ events: [{ tStartMs: 1, dDurationMs: 2, segs: [{ utf8: 'Page' }] }] });
      }
      return new Response('', { status: 404 });
    };

    expect((await fetchYouTubeTranscriptFromSources('video', 'fr', fetchImpl))?.text).toBe('Page');
    expect(playerCalls).toBe(2);
  });

  it('falls back to timed-text list and skips unusable tracks', async () => {
    const calls: string[] = [];
    const fetchImpl = async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url.includes('/youtubei/v1/player')) return Response.json({});
      if (url.includes('/watch?')) return new Response('<html></html>');
      if (url.includes('/api/timedtext?type=list')) {
        return new Response('<transcript_list><track lang_code="en" name="English &amp; bad"/><track lang_code="de" kind="asr"/></transcript_list>');
      }
      if (url.includes('lang=en')) return Response.json({ events: [] });
      if (url.includes('lang=de')) {
        return Response.json({ events: [{ tStartMs: 8, dDurationMs: 9, segs: [{ utf8: 'Zeit' }] }] });
      }
      return new Response('', { status: 404 });
    };

    await expect(fetchYouTubeTranscriptFromSources('video', 'en-US', fetchImpl)).resolves.toMatchObject({
      text: 'Zeit',
      language: 'de',
    });
    expect(calls.some((url) => url.includes('name=English+%26+bad') && url.includes('fmt=json3'))).toBe(true);
    expect(calls.some((url) => url.includes('lang=de') && url.includes('kind=asr') && url.includes('fmt=json3'))).toBe(true);
  });
});

describe('sortAudioCandidates', () => {
  it('orders valid audio candidates by bitrate and filters missing URLs', async () => {
    const { sortAudioCandidates } = await import('./youtube-transcript');
    expect(sortAudioCandidates).toBeTypeOf('function');

    const result = sortAudioCandidates([
      { url: '', mimeType: 'audio/mp4', bitrate: 192000 },
      { url: 'https://cdn.example.com/low.m4a', mimeType: 'audio/mp4', bitrate: 64000 },
      { url: 'https://cdn.example.com/high.m4a', mimeType: 'audio/mp4', bitrate: 128000 },
    ]);

    expect(
      result.map((candidate: { url: string; mimeType: string; bitrate: number }) => candidate.url),
    ).toEqual([
      'https://cdn.example.com/high.m4a',
      'https://cdn.example.com/low.m4a',
    ]);
  });
});

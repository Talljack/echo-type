import { PRONUNCIATION_SOUNDS } from './pronunciation-practice';

export interface StudioSound {
  id: string;
  ipa: string;
  group: 'vowel' | 'consonant' | 'cluster';
  examples: string[];
  tip: string;
  tipZh: string;
}

const vowels = [
  [
    'iy',
    'iː',
    'sheep,see,team',
    'Raise the front of your tongue; spread your lips gently.',
    '舌前部抬高，双唇自然展开。',
  ],
  ['ih', 'ɪ', 'ship,sit,busy', 'Relax your tongue slightly lower than /iː/.', '舌位比 /iː/ 略低，保持放松。'],
  ['eh', 'e', 'bed,red,head', 'Keep the tongue forward and the jaw partly open.', '舌位靠前，下颌稍张开。'],
  ['ae', 'æ', 'cat,bag,map', 'Lower the jaw with your tongue forward.', '舌位靠前，下颌比 /e/ 张得更开。'],
  ['aa', 'ɑː', 'father,calm,palm', 'Open your jaw and keep the tongue low and back.', '张开下颌，舌位低而靠后。'],
  [
    'lot',
    'ɒ',
    'hot,not,lot',
    'Round the lips with a low back tongue (British English).',
    '舌位低而靠后，双唇略圆（英式英语）。',
  ],
  [
    'thought',
    'ɔː',
    'thought,saw,law',
    'Round the lips and raise the back of the tongue slightly.',
    '双唇呈圆形，舌后部略抬高。',
  ],
  ['uu', 'ʊ', 'foot,book,good', 'Round your lips loosely; keep the tongue relaxed.', '双唇微圆，舌头放松。'],
  ['uw', 'uː', 'food,blue,too', 'Raise the back of the tongue and round the lips.', '舌后部抬高，双唇收圆。'],
  ['uh', 'ʌ', 'cup,but,sun', 'Use a relaxed central tongue with the jaw partly open.', '舌位居中、放松，下颌稍张开。'],
  [
    'er',
    'ɜː',
    'bird,her,word',
    'Hold a central vowel; this British model has no final R curl.',
    '保持中央元音；此处英式示范不卷舌。',
  ],
  ['schwa', 'ə', 'about,sofa,again', 'Relax the mouth for a weak unstressed vowel.', '口腔放松，轻读非重读元音。'],
  ['ei', 'eɪ', 'say,rain,cake', 'Glide from /e/ toward /ɪ/.', '从 /e/ 向 /ɪ/ 滑动。'],
  ['ai', 'aɪ', 'time,my,light', 'Start open and glide toward /ɪ/.', '从开口元音向 /ɪ/ 滑动。'],
  ['oi', 'ɔɪ', 'boy,voice,choice', 'Start rounded and glide toward /ɪ/.', '从圆唇元音向 /ɪ/ 滑动。'],
  ['ou', 'əʊ', 'boat,home,snow', 'Start central and glide toward rounded lips.', '从中央元音滑向圆唇元音。'],
  ['au', 'aʊ', 'cow,now,out', 'Start open and finish with rounded lips.', '开口起音，以圆唇收尾。'],
  ['near', 'ɪə', 'near,ear,here', 'Glide from /ɪ/ toward schwa; British reference.', '从 /ɪ/ 滑向 /ə/；英式参考。'],
  [
    'square',
    'eə',
    'care,hair,pair',
    'Glide toward schwa; many British speakers use a long vowel.',
    '向 /ə/ 滑动；许多英式口音会读成长元音。',
  ],
  [
    'cure',
    'ʊə',
    'cure,pure,tour',
    'Glide toward schwa; this sound varies across accents.',
    '向 /ə/ 滑动；此音在不同口音中差异较大。',
  ],
] as const;

const consonantZh: Record<string, string> = {
  b: '双唇闭合，声带振动后释放气流。',
  p: '双唇闭合，不振动声带，释放气流。',
  ch: '先阻住气流，再以 /ʃ/ 的方式释放。',
  d: '舌尖接触上齿后方，声带振动后释放。',
  t: '舌尖接触上齿后方，不振动声带后释放。',
  f: '上齿轻触下唇，不振动声带。',
  v: '上齿轻触下唇，声带振动。',
  g: '舌后部接触软腭，声带振动后释放。',
  k: '舌后部接触软腭，不振动声带后释放。',
  h: '放松喉部，让气流通过。',
  j: '用 /tʃ/ 的口型，同时振动声带。',
  m: '闭合双唇，气流从鼻腔通过。',
  n: '舌尖接触上齿后方，气流从鼻腔通过。',
  ng: '舌后部抬起，气流从鼻腔通过。',
  l: '舌尖接触上齿后方，气流从舌两侧通过。',
  r: '舌头向后收，不接触上腭；不要颤舌。',
  s: '舌尖靠近上齿后方，形成窄气流，不振动声带。',
  z: '保持 /s/ 的口型，振动声带。',
  sh: '双唇微圆，舌前部接近上腭，让气流通过。',
  zh: '保持 /ʃ/ 的口型，振动声带。',
  'th-voiceless': '舌尖轻放在上下齿之间，送气，不振动声带。',
  'th-voiced': '舌尖轻放在上下齿之间，声带振动。',
  w: '双唇收圆，迅速滑入后面的元音。',
  y: '舌位抬高靠前，滑入后面的元音。',
};

/** A teaching chart: 44 conventional British phonemes plus four consonant clusters. */
export const STUDIO_SOUNDS: StudioSound[] = [
  ...vowels.map(([id, ipa, examples, tip, tipZh]) => ({
    id,
    ipa,
    examples: examples.split(','),
    tip,
    tipZh,
    group: 'vowel' as const,
  })),
  ...PRONUNCIATION_SOUNDS.filter((s) => s.group === 'consonants').map((s) => ({
    id: s.id,
    ipa: s.id === 'r' ? 'ɹ' : s.ipa,
    examples: s.examples,
    tip: s.tip,
    tipZh: consonantZh[s.id],
    group: 'consonant' as const,
  })),
  ...(['tr', 'dr', 'ts', 'dz'] as const).map((id, i) => ({
    id,
    ipa: id === 'tr' ? 'tɹ' : id === 'dr' ? 'dɹ' : id,
    examples: [
      ['tree', 'train'],
      ['dream', 'dress'],
      ['cats', 'hats'],
      ['beds', 'words'],
    ][i],
    tip: 'Join the two consonants without adding a vowel between them.',
    tipZh: '连续发出两个辅音，中间不要加入元音。',
    group: 'cluster' as const,
  })),
];

export const MINIMAL_PAIRS = [
  { soundId: 'ih', words: ['ship', 'sheep'] },
  { soundId: 'th-voiceless', words: ['thin', 'sin'] },
  { soundId: 'v', words: ['vest', 'west'] },
  { soundId: 'l', words: ['light', 'right'] },
  { soundId: 'ae', words: ['bad', 'bed'] },
  { soundId: 'uu', words: ['full', 'fool'] },
] as const;

export function recognitionMatches(target: string, transcript: string): boolean {
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z\s']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return normalize(target).length > 0 && normalize(target) === normalize(transcript);
}

export function actualMetric(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : undefined;
}

export interface AcousticAssessment {
  overall?: number;
  fluency?: number;
  completeness?: number;
  phonemes: { phoneme: string; score: number }[];
}

export function parseAcousticAssessment(data: unknown): AcousticAssessment {
  const payload = data as { status?: string; result?: Record<string, unknown> } | null;
  if (payload?.status !== 'success' || !payload.result) throw new Error('SpeechSuper returned no acoustic assessment.');
  const r = payload.result;
  const phonemes: AcousticAssessment['phonemes'] = [];
  if (Array.isArray(r.words))
    for (const word of r.words) {
      if (!word || !Array.isArray(word.phonemes)) continue;
      for (const p of word.phonemes) {
        const score = actualMetric(p?.pronunciation ?? p?.quality_score ?? p?.scores?.overall);
        if (typeof p?.phoneme === 'string' && p.phoneme.trim() && score !== undefined)
          phonemes.push({ phoneme: p.phoneme, score });
      }
    }
  const assessment = {
    overall: actualMetric(r.overall),
    fluency: actualMetric(r.fluency),
    completeness: actualMetric(r.integrity),
    phonemes,
  };
  if (
    assessment.overall === undefined &&
    assessment.fluency === undefined &&
    assessment.completeness === undefined &&
    !phonemes.length
  )
    throw new Error('SpeechSuper returned no supported acoustic metrics.');
  return assessment;
}

export function legacyPracticedIds(raw: string | null): string[] {
  try {
    const data = JSON.parse(raw ?? '{}');
    const known = new Set([...STUDIO_SOUNDS, ...PRONUNCIATION_SOUNDS].map((s) => s.id));
    return Array.isArray(data?.completed)
      ? [
          ...new Set<string>(
            data.completed.filter((id: unknown): id is string => typeof id === 'string' && known.has(id)),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}

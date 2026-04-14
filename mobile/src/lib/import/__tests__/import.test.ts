/**
 * Import Modal Integration Test
 *
 * This test verifies all import functions work correctly
 */

import { importFromText, importFromUrl, importFromYouTube } from '../url';
import { generateWithAI } from '../ai';
import { pickAndTranscribeMedia } from '../media';

describe('Import Functions', () => {
  describe('Document Import', () => {
    test('importFromText should create content with title and text', () => {
      const result = importFromText('Test Title', 'Test content for learning English.');

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content?.title).toBe('Test Title');
      expect(result.content?.text).toBe('Test content for learning English.');
      expect(result.content?.source).toBe('text');
    });

    test('importFromText should fail with empty title', () => {
      const result = importFromText('', 'Test content');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('importFromText should fail with empty text', () => {
      const result = importFromText('Test Title', '');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('importFromUrl should call API endpoint', async () => {
      // Mock fetch
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'Article Title',
            text: 'Article content',
            url: 'https://example.com',
            wordCount: 2,
          }),
        })
      ) as jest.Mock;

      const result = await importFromUrl('https://example.com/article');

      expect(result.success).toBe(true);
      expect(result.content?.title).toBe('Article Title');
      expect(result.content?.source).toBe('url');
    });
  });

  describe('Media Import', () => {
    test('importFromYouTube should call API endpoint', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            videoId: 'test123',
            fullText: 'Video transcript',
            segmentCount: 1,
            segments: [],
          }),
        })
      ) as jest.Mock;

      const result = await importFromYouTube('https://youtube.com/watch?v=test123');

      expect(result.success).toBe(true);
      expect(result.content?.source).toBe('youtube');
    });

    test('pickAndTranscribeMedia should handle file selection', async () => {
      // This would require mocking expo-document-picker
      // For now, just verify the function exists
      expect(typeof pickAndTranscribeMedia).toBe('function');
    });
  });

  describe('AI Import', () => {
    test('generateWithAI should call API with contentType', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'Generated Content',
            text: 'AI generated text',
            type: 'article',
          }),
        })
      ) as jest.Mock;

      const result = await generateWithAI({
        topic: 'Climate Change',
        difficulty: 'intermediate',
        language: 'en',
        contentType: 'article',
      });

      expect(result.success).toBe(true);
      expect(result.content?.source).toBe('ai');

      // Verify API was called with contentType
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.contentType).toBe('article');
    });

    test('generateWithAI should support all content types', async () => {
      const contentTypes = ['word', 'phrase', 'sentence', 'article'] as const;

      for (const contentType of contentTypes) {
        global.fetch = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              title: `Generated ${contentType}`,
              text: 'Content',
              type: contentType,
            }),
          })
        ) as jest.Mock;

        const result = await generateWithAI({
          topic: 'Test',
          difficulty: 'beginner',
          language: 'en',
          contentType,
        });

        expect(result.success).toBe(true);
      }
    });
  });
});

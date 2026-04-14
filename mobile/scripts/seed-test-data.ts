/**
 * Seed test data for development and testing
 * Run this in the app to populate test content
 */

import { useLibraryStore } from '@/stores/useLibraryStore';

export function seedTestData() {
  const libraryStore = useLibraryStore.getState();

  // Add test articles
  const littlePrinceText = `Once when I was six years old I saw a magnificent picture in a book, called True Stories from Nature, about the primeval forest. It was a picture of a boa constrictor in the act of swallowing an animal.

In the book it said: "Boa constrictors swallow their prey whole, without chewing it. After that they are not able to move, and they sleep through the six months that they need for digestion."

I pondered deeply, then, over the adventures of the jungle. And after some work with a colored pencil I succeeded in making my first drawing. My Drawing Number One looked like this:

I showed my masterpiece to the grown-ups, and asked them whether the drawing frightened them. But they answered: "Frighten? Why should any one be frightened by a hat?"`;

  const conversationText = `A: Hello, how are you today?
B: I am doing well, thank you for asking. What are your plans for the weekend?
A: I am planning to visit the museum and then have dinner with friends. That sounds wonderful!
B: Would you like to join us?
A: I would love to! What time should I meet you?
B: Let's meet at the museum entrance at 2 PM.
A: Perfect! I'll see you then.`;

  const reactNativeText = `React Native is a popular framework for building mobile applications using JavaScript and React. It allows developers to create native mobile apps for iOS and Android using a single codebase.

One of the key advantages of React Native is its ability to provide a native user experience while maintaining the productivity benefits of web development. Components are rendered using native platform APIs, ensuring smooth performance and authentic look and feel.

The framework uses a bridge to communicate between JavaScript code and native modules, enabling access to device features like camera, GPS, and sensors. This architecture makes it possible to write most of your app in JavaScript while still leveraging platform-specific capabilities when needed.`;

  const testContents = [
    {
      id: 'test-little-prince',
      title: 'The Little Prince - Chapter 1',
      content: littlePrinceText,
      text: littlePrinceText,
      language: 'en' as const,
      type: 'article' as const,
      difficulty: 'intermediate' as const,
      tags: ['literature', 'classic'],
      isFavorite: false,
      progress: 0,
      createdAt: Date.now() - 86400000, // 1 day ago
      updatedAt: Date.now() - 86400000,
    },
    {
      id: 'test-daily-conversation',
      title: 'Daily Conversation Practice',
      content: conversationText,
      text: conversationText,
      language: 'en' as const,
      type: 'article' as const,
      difficulty: 'beginner' as const,
      tags: ['conversation', 'daily-life'],
      isFavorite: true,
      progress: 0.5,
      createdAt: Date.now() - 172800000, // 2 days ago
      updatedAt: Date.now() - 3600000, // 1 hour ago
    },
    {
      id: 'test-tech-article',
      title: 'Introduction to React Native',
      content: reactNativeText,
      text: reactNativeText,
      language: 'en' as const,
      type: 'article' as const,
      difficulty: 'advanced' as const,
      tags: ['technology', 'programming'],
      isFavorite: false,
      progress: 0.2,
      createdAt: Date.now() - 259200000, // 3 days ago
      updatedAt: Date.now() - 7200000, // 2 hours ago
    },
  ];

  testContents.forEach((content) => {
    libraryStore.addContent(content);
  });

  console.log('✅ Test data seeded successfully!');
  console.log(`   - Added ${testContents.length} test articles`);

  return {
    contents: testContents.length,
  };
}

// For easy access in dev tools
if (typeof window !== 'undefined') {
  (window as any).seedTestData = seedTestData;
}

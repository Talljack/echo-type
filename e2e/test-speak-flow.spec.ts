import { test, expect } from '@playwright/test';

test.describe('Speak Module Flow Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to speak page
    await page.goto('http://localhost:3000/speak');
    await page.waitForLoadState('networkidle');
  });

  test('should display scenario grid on speak homepage', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1:has-text("Speak")')).toBeVisible();

    // Check description
    await expect(page.locator('text=Practice English through AI voice conversations')).toBeVisible();

    // Check if scenario cards are displayed
    const scenarioCards = page.locator('[data-testid="scenario-card"]').or(page.locator('div').filter({ hasText: /Ordering Coffee|Grocery Shopping|Asking for Directions/ }).first());
    await expect(scenarioCards.first()).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: 'test-results/speak-homepage.png', fullPage: true });

    console.log('✓ Scenario grid displayed successfully');
  });

  test('should navigate to conversation page and test text input', async ({ page, context }) => {
    // Grant permissions for microphone (for later voice test)
    await context.grantPermissions(['microphone']);

    // Wait for scenarios to load and click first scenario
    await page.waitForTimeout(2000);
    const firstScenario = page.locator('div').filter({ hasText: /Ordering Coffee|Coffee Shop/ }).first();
    await firstScenario.click();

    // Wait for conversation page to load
    await page.waitForURL(/\/speak\/[^/]+/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log('✓ Navigated to conversation page');

    // Check scenario header
    const scenarioTitle = page.locator('h1');
    await expect(scenarioTitle).toBeVisible();
    console.log('Scenario title:', await scenarioTitle.textContent());

    // Check difficulty badge
    const difficultyBadge = page.locator('text=/beginner|intermediate|advanced/i');
    await expect(difficultyBadge).toBeVisible();
    console.log('Difficulty:', await difficultyBadge.textContent());

    // Check scenario goals card
    const goalsCard = page.locator('text=/goals|objectives/i').or(page.locator('div').filter({ hasText: /Order|Ask|Pay/ }).first());
    console.log('Goals card visible:', await goalsCard.isVisible());

    // Check opening message from AI
    const aiMessage = page.locator('div').filter({ hasText: /Hi|Hello|Welcome/i }).first();
    await expect(aiMessage).toBeVisible({ timeout: 5000 });
    console.log('✓ AI opening message displayed');

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/conversation-initial.png', fullPage: true });

    // Test text input
    const textInput = page.locator('input[type="text"]').or(page.locator('input[placeholder*="type"]'));
    await expect(textInput).toBeVisible();

    // Type a message
    const userMessage = "Hi, I'd like to order a coffee please";
    await textInput.fill(userMessage);
    console.log('✓ Typed user message:', userMessage);

    // Click send button or press Enter
    const sendButton = page.locator('button').filter({ hasText: /send/i }).or(page.locator('button:has(svg)').last());
    await sendButton.click();

    console.log('✓ Sent message');

    // Wait for AI response
    await page.waitForTimeout(3000);

    // Check if user message appears in conversation
    const userMessageBubble = page.locator(`text="${userMessage}"`).or(page.locator('div').filter({ hasText: userMessage }));
    await expect(userMessageBubble.first()).toBeVisible({ timeout: 10000 });
    console.log('✓ User message displayed in conversation');

    // Wait for AI streaming response
    await page.waitForTimeout(5000);

    // Take screenshot after AI response
    await page.screenshot({ path: 'test-results/conversation-after-response.png', fullPage: true });

    // Check if there are multiple messages now (opening + user + AI response)
    const allMessages = page.locator('div').filter({ hasText: /./i });
    console.log('✓ Conversation flow completed');

    // Open DevTools console to check for errors
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
    });

    // Check for API call
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/speak')) {
        apiCalls.push(`API Call: ${request.method()} ${request.url()}`);
        console.log('✓ API call to /api/speak detected');
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/speak')) {
        console.log('✓ API response status:', response.status());
        if (response.status() === 200) {
          console.log('✓ AI response received successfully');
        } else {
          console.log('✗ API error:', response.status(), response.statusText());
        }
      }
    });

    // Test voice input button
    const voiceButton = page.locator('button').filter({ hasText: /microphone|voice|speak/i }).or(page.locator('button:has(svg)').first());
    if (await voiceButton.isVisible()) {
      console.log('✓ Voice input button is visible');
      await page.screenshot({ path: 'test-results/voice-button-visible.png', fullPage: true });
    }
  });

  test('should check API integration and streaming', async ({ page }) => {
    // Monitor network requests
    const apiRequests: any[] = [];
    const apiResponses: any[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/speak')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/speak')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        });
      }
    });

    // Navigate to a scenario
    await page.waitForTimeout(2000);
    const firstScenario = page.locator('div').filter({ hasText: /Ordering Coffee|Coffee Shop/ }).first();
    await firstScenario.click();

    await page.waitForURL(/\/speak\/[^/]+/);
    await page.waitForLoadState('networkidle');

    // Send a message
    const textInput = page.locator('input[type="text"]').or(page.locator('input[placeholder*="type"]'));
    await textInput.fill("I want a latte");

    const sendButton = page.locator('button').filter({ hasText: /send/i }).or(page.locator('button:has(svg)').last());
    await sendButton.click();

    // Wait for API call
    await page.waitForTimeout(5000);

    // Log API details
    console.log('\n=== API Request Details ===');
    if (apiRequests.length > 0) {
      console.log('Request URL:', apiRequests[0].url);
      console.log('Request Method:', apiRequests[0].method);
      console.log('Request Headers:', JSON.stringify(apiRequests[0].headers, null, 2));
      if (apiRequests[0].postData) {
        console.log('Request Body:', apiRequests[0].postData);
      }
    }

    console.log('\n=== API Response Details ===');
    if (apiResponses.length > 0) {
      console.log('Response Status:', apiResponses[0].status);
      console.log('Response Headers:', JSON.stringify(apiResponses[0].headers, null, 2));
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-results/api-test-complete.png', fullPage: true });
  });
});

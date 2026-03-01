import { test, expect } from '@playwright/test';

test.describe('Speak Module - Detailed API & LLM Test', () => {
  test('should test complete conversation flow with API monitoring', async ({ page, context }) => {
    // Grant microphone permission
    await context.grantPermissions(['microphone']);

    // Monitor all network activity
    const networkLogs: any[] = [];
    const apiCalls: any[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/speak')) {
        console.log('\n🔵 API REQUEST:', request.method(), request.url());
        const postData = request.postData();
        if (postData) {
          try {
            const parsed = JSON.parse(postData);
            console.log('📤 Request Body:', JSON.stringify(parsed, null, 2));
            apiCalls.push({ type: 'request', data: parsed, timestamp: Date.now() });
          } catch (e) {
            console.log('📤 Request Body (raw):', postData);
          }
        }
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/speak')) {
        console.log('\n🟢 API RESPONSE:', response.status(), response.statusText());
        console.log('📥 Response Headers:', JSON.stringify(response.headers(), null, 2));

        // Try to read streaming response
        try {
          const body = await response.body();
          const text = body.toString('utf-8');
          console.log('📥 Response Body (first 500 chars):', text.substring(0, 500));
          apiCalls.push({ type: 'response', status: response.status(), body: text, timestamp: Date.now() });
        } catch (e) {
          console.log('📥 Response Body: [streaming or binary]');
        }
      }
    });

    // Monitor console logs
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`🔴 Console ${type}:`, msg.text());
      }
    });

    // Navigate to speak page
    console.log('\n=== STEP 1: Navigate to Speak Page ===');
    await page.goto('http://localhost:3000/speak');
    await page.waitForLoadState('networkidle');

    // Take screenshot of homepage
    await page.screenshot({ path: 'test-results/01-speak-homepage.png', fullPage: true });
    console.log('✓ Screenshot saved: 01-speak-homepage.png');

    // Click on first scenario (Ordering Coffee)
    console.log('\n=== STEP 2: Select Scenario ===');
    await page.waitForTimeout(1000);

    // Try to find and click the first scenario card
    const scenarioCard = page.locator('div').filter({ hasText: /Ordering Coffee|Coffee Shop|Grocery Shopping/ }).first();
    await scenarioCard.click();
    console.log('✓ Clicked on scenario');

    // Wait for navigation to conversation page
    await page.waitForURL(/\/speak\/[^/]+/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    console.log('✓ Navigated to conversation page');

    // Take screenshot of initial conversation page
    await page.screenshot({ path: 'test-results/02-conversation-initial.png', fullPage: true });
    console.log('✓ Screenshot saved: 02-conversation-initial.png');

    // Get scenario details
    const scenarioTitle = await page.locator('h1').first().textContent();
    console.log('📋 Scenario:', scenarioTitle);

    // Check for AI opening message
    console.log('\n=== STEP 3: Verify AI Opening Message ===');
    await page.waitForTimeout(2000);

    const messages = page.locator('div').filter({ hasText: /Hi|Hello|Welcome|Can I help/i });
    const messageCount = await messages.count();
    console.log(`✓ Found ${messageCount} message(s) on page`);

    // Send first user message via text input
    console.log('\n=== STEP 4: Send User Message (Text Input) ===');
    const textInput = page.locator('input[type="text"]').or(page.locator('input[placeholder*="type"]'));
    await expect(textInput).toBeVisible();

    const userMessage1 = "Hi, I'd like to order a coffee";
    await textInput.fill(userMessage1);
    console.log('✓ Typed message:', userMessage1);

    // Click send button
    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await sendButton.click();
    console.log('✓ Clicked send button');

    // Wait for API call and response
    console.log('\n=== STEP 5: Wait for AI Response ===');
    await page.waitForTimeout(8000); // Wait for streaming to complete

    // Take screenshot after first response
    await page.screenshot({ path: 'test-results/03-after-first-response.png', fullPage: true });
    console.log('✓ Screenshot saved: 03-after-first-response.png');

    // Verify user message appears
    const userMessageBubble = page.locator('div').filter({ hasText: userMessage1 });
    await expect(userMessageBubble.first()).toBeVisible();
    console.log('✓ User message displayed in conversation');

    // Count messages after first exchange
    const allMessageDivs = page.locator('div').filter({ hasText: /.+/ });
    console.log(`✓ Total elements on page: ${await allMessageDivs.count()}`);

    // Send second message
    console.log('\n=== STEP 6: Send Second Message ===');
    await page.waitForTimeout(1000);

    const userMessage2 = "What sizes do you have?";
    await textInput.fill(userMessage2);
    await sendButton.click();
    console.log('✓ Sent second message:', userMessage2);

    // Wait for second response
    await page.waitForTimeout(8000);

    // Take screenshot after second response
    await page.screenshot({ path: 'test-results/04-after-second-response.png', fullPage: true });
    console.log('✓ Screenshot saved: 04-after-second-response.png');

    // Check voice input button
    console.log('\n=== STEP 7: Check Voice Input Button ===');
    const voiceButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    const isVoiceButtonVisible = await voiceButton.isVisible();
    console.log('✓ Voice button visible:', isVoiceButtonVisible);

    if (isVoiceButtonVisible) {
      await page.screenshot({ path: 'test-results/05-voice-button.png', fullPage: true });
      console.log('✓ Screenshot saved: 05-voice-button.png');
    }

    // Print API call summary
    console.log('\n=== API CALL SUMMARY ===');
    console.log(`Total API calls: ${apiCalls.filter(c => c.type === 'request').length}`);
    console.log(`Total API responses: ${apiCalls.filter(c => c.type === 'response').length}`);

    apiCalls.forEach((call, idx) => {
      if (call.type === 'request') {
        console.log(`\nAPI Call #${idx + 1}:`);
        console.log('  Messages sent:', call.data.messages?.length || 0);
        console.log('  Provider:', call.data.provider);
        console.log('  Model:', call.data.modelId);
        console.log('  Scenario:', call.data.scenario?.title);
      } else if (call.type === 'response') {
        console.log(`\nAPI Response #${idx + 1}:`);
        console.log('  Status:', call.status);
        console.log('  Body length:', call.body?.length || 0);
      }
    });

    // Final screenshot
    await page.screenshot({ path: 'test-results/06-final-state.png', fullPage: true });
    console.log('\n✓ Test completed successfully');
    console.log('✓ All screenshots saved to test-results/');
  });

  test('should test voice input button interaction', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);

    await page.goto('http://localhost:3000/speak');
    await page.waitForLoadState('networkidle');

    // Select a scenario
    const scenarioCard = page.locator('div').filter({ hasText: /Ordering Coffee|Coffee Shop/ }).first();
    await scenarioCard.click();
    await page.waitForURL(/\/speak\/[^/]+/);
    await page.waitForLoadState('networkidle');

    console.log('\n=== Testing Voice Input Button ===');

    // Find voice button
    const voiceButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(voiceButton).toBeVisible();
    console.log('✓ Voice button found');

    // Take screenshot before clicking
    await page.screenshot({ path: 'test-results/voice-before-click.png', fullPage: true });

    // Click voice button to start recording
    await voiceButton.click();
    console.log('✓ Clicked voice button (should start recording)');

    // Wait a moment
    await page.waitForTimeout(2000);

    // Take screenshot during recording
    await page.screenshot({ path: 'test-results/voice-recording.png', fullPage: true });
    console.log('✓ Screenshot during recording');

    // Click again to stop recording
    await voiceButton.click();
    console.log('✓ Clicked voice button again (should stop recording)');

    // Wait for processing
    await page.waitForTimeout(3000);

    // Take screenshot after recording
    await page.screenshot({ path: 'test-results/voice-after-recording.png', fullPage: true });
    console.log('✓ Screenshot after recording');
  });

  test('should verify scenario data structure', async ({ page }) => {
    await page.goto('http://localhost:3000/speak');
    await page.waitForLoadState('networkidle');

    console.log('\n=== Verifying Scenario Data ===');

    // Check if scenarios are loaded
    const scenarioCards = page.locator('[data-testid="scenario-card"]').or(
      page.locator('div').filter({ hasText: /Ordering Coffee|Grocery Shopping|Asking for Directions/ })
    );

    const count = await scenarioCards.count();
    console.log(`✓ Found ${count} scenario cards`);

    // Click first scenario and check structure
    await scenarioCards.first().click();
    await page.waitForURL(/\/speak\/[^/]+/);
    await page.waitForLoadState('networkidle');

    // Check page elements
    const hasTitle = await page.locator('h1').isVisible();
    const hasBackButton = await page.locator('button').filter({ has: page.locator('svg') }).first().isVisible();
    const hasTextInput = await page.locator('input[type="text"]').isVisible();
    const hasSendButton = await page.locator('button').filter({ has: page.locator('svg') }).last().isVisible();

    console.log('✓ Page structure:');
    console.log('  - Title:', hasTitle);
    console.log('  - Back button:', hasBackButton);
    console.log('  - Text input:', hasTextInput);
    console.log('  - Send button:', hasSendButton);

    await page.screenshot({ path: 'test-results/scenario-structure.png', fullPage: true });
  });
});

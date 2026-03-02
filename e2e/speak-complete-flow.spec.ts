import { test } from '@playwright/test';

test.describe('Speak Module - Complete Flow with API Setup', () => {
  test('should setup provider and test complete conversation flow', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);

    // Monitor API calls
    const apiCalls: any[] = [];

    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || type === 'warning') {
        console.log(`[${type.toUpperCase()}]`, text);
      }
    });

    page.on('request', request => {
      if (request.url().includes('/api/speak')) {
        console.log('\n🔵 API REQUEST');
        const postData = request.postData();
        if (postData) {
          try {
            const data = JSON.parse(postData);
            console.log('  Provider:', data.provider);
            console.log('  Model:', data.modelId);
            console.log('  Messages:', data.messages?.length);
            apiCalls.push({ type: 'request', data, timestamp: Date.now() });
          } catch (e) {
            console.log('  Body:', postData.substring(0, 200));
          }
        }
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/speak')) {
        console.log('\n🟢 API RESPONSE');
        console.log('  Status:', response.status());

        if (response.status() === 200) {
          try {
            const body = await response.body();
            const text = body.toString('utf-8');
            console.log('  Response length:', text.length, 'bytes');
            console.log('  First 300 chars:', text.substring(0, 300));
            apiCalls.push({ type: 'response', status: 200, body: text, timestamp: Date.now() });
          } catch (e) {
            console.log('  [Streaming response]');
          }
        } else {
          try {
            const errorBody = await response.text();
            console.log('  ❌ Error:', errorBody);
            apiCalls.push({ type: 'error', status: response.status(), error: errorBody, timestamp: Date.now() });
          } catch (e) {
            console.log('  ❌ Status:', response.status());
          }
        }
      }
    });

    // Step 1: Navigate to settings to configure provider
    console.log('\n' + '='.repeat(80));
    console.log('STEP 1: Configure Provider (Settings)');
    console.log('='.repeat(80));

    await page.goto('http://localhost:3000/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/flow-01-settings.png', fullPage: true });
    console.log('✓ Screenshot: flow-01-settings.png');

    // Check if Ollama is available
    const ollamaOption = page.locator('text=/ollama/i').first();
    const hasOllama = await ollamaOption.isVisible().catch(() => false);

    if (hasOllama) {
      console.log('✓ Ollama option found, selecting Ollama provider');

      // Try to select Ollama
      await ollamaOption.click().catch(() => console.log('Could not click Ollama option'));
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'test-results/flow-02-ollama-selected.png', fullPage: true });
      console.log('✓ Screenshot: flow-02-ollama-selected.png');
    } else {
      console.log('⚠️  Ollama not found, checking for OpenAI configuration');

      // Check if OpenAI API key input exists
      const apiKeyInput = page.locator('input[type="password"]').or(page.locator('input[placeholder*="API"]')).first();
      const hasApiKeyInput = await apiKeyInput.isVisible().catch(() => false);

      if (hasApiKeyInput) {
        console.log('⚠️  API key input found but no key configured');
        console.log('⚠️  Please configure an API key in Settings or use Ollama');
      }
    }

    // Step 2: Navigate to Speak page
    console.log('\n' + '='.repeat(80));
    console.log('STEP 2: Navigate to Speak Page');
    console.log('='.repeat(80));

    await page.goto('http://localhost:3000/speak');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/flow-03-speak-homepage.png', fullPage: true });
    console.log('✓ Screenshot: flow-03-speak-homepage.png');

    // Count scenarios
    const scenarioCards = page.locator('div').filter({ hasText: /Ordering Coffee|Grocery Shopping|Asking for Directions/ });
    const scenarioCount = await scenarioCards.count();
    console.log(`✓ Found ${scenarioCount} scenarios`);

    // Step 3: Select a scenario
    console.log('\n' + '='.repeat(80));
    console.log('STEP 3: Select Scenario');
    console.log('='.repeat(80));

    await scenarioCards.first().click();
    await page.waitForURL(/\/speak\/[^/]+/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const scenarioTitle = await page.locator('h1').first().textContent();
    console.log('✓ Selected scenario:', scenarioTitle);

    await page.screenshot({ path: 'test-results/flow-04-scenario-loaded.png', fullPage: true });
    console.log('✓ Screenshot: flow-04-scenario-loaded.png');

    // Check for opening message
    console.log('\n✓ Checking for AI opening message...');
    await page.waitForTimeout(1000);

    // Step 4: Send first message
    console.log('\n' + '='.repeat(80));
    console.log('STEP 4: Send First Message');
    console.log('='.repeat(80));

    const textInput = page.locator('input[type="text"]').or(page.locator('input[placeholder*="type"]'));
    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();

    const message1 = "Hi, I'd like to order a coffee";
    await textInput.fill(message1);
    console.log('✓ Typed:', message1);

    await sendButton.click();
    console.log('✓ Clicked send');

    console.log('⏳ Waiting 10 seconds for API response...');
    await page.waitForTimeout(10000);

    await page.screenshot({ path: 'test-results/flow-05-after-message-1.png', fullPage: true });
    console.log('✓ Screenshot: flow-05-after-message-1.png');

    // Step 5: Send second message
    console.log('\n' + '='.repeat(80));
    console.log('STEP 5: Send Second Message');
    console.log('='.repeat(80));

    await page.waitForTimeout(2000);

    const message2 = "What sizes do you have?";
    await textInput.fill(message2);
    console.log('✓ Typed:', message2);

    await sendButton.click();
    console.log('✓ Clicked send');

    console.log('⏳ Waiting 10 seconds for API response...');
    await page.waitForTimeout(10000);

    await page.screenshot({ path: 'test-results/flow-06-after-message-2.png', fullPage: true });
    console.log('✓ Screenshot: flow-06-after-message-2.png');

    // Step 6: Test voice button
    console.log('\n' + '='.repeat(80));
    console.log('STEP 6: Test Voice Input Button');
    console.log('='.repeat(80));

    const voiceButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    const isVoiceVisible = await voiceButton.isVisible();
    console.log('✓ Voice button visible:', isVoiceVisible);

    if (isVoiceVisible) {
      await page.screenshot({ path: 'test-results/flow-07-voice-button.png', fullPage: true });

      // Click to start recording
      await voiceButton.click();
      console.log('✓ Clicked voice button (start recording)');

      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/flow-08-recording.png', fullPage: true });
      console.log('✓ Screenshot: flow-08-recording.png');

      // Click to stop recording
      await voiceButton.click();
      console.log('✓ Clicked voice button (stop recording)');

      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/flow-09-after-recording.png', fullPage: true });
      console.log('✓ Screenshot: flow-09-after-recording.png');
    }

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('Total API Calls:', apiCalls.filter(c => c.type === 'request').length);
    console.log('Total API Responses:', apiCalls.filter(c => c.type === 'response').length);
    console.log('Total API Errors:', apiCalls.filter(c => c.type === 'error').length);

    if (apiCalls.length > 0) {
      console.log('\n📊 API Call Details:');
      apiCalls.forEach((call, idx) => {
        if (call.type === 'request') {
          console.log(`\n[${idx + 1}] REQUEST`);
          console.log('  Provider:', call.data.provider);
          console.log('  Model:', call.data.modelId);
          console.log('  Messages:', call.data.messages?.length);
        } else if (call.type === 'response') {
          console.log(`\n[${idx + 1}] RESPONSE`);
          console.log('  Status:', call.status);
          console.log('  Body length:', call.body?.length);
          console.log('  Preview:', call.body?.substring(0, 200));
        } else if (call.type === 'error') {
          console.log(`\n[${idx + 1}] ERROR`);
          console.log('  Status:', call.status);
          console.log('  Error:', call.error);
        }
      });
    } else {
      console.log('\n⚠️  No API calls detected!');
      console.log('This likely means:');
      console.log('  1. No API key is configured');
      console.log('  2. Ollama is not running');
      console.log('  3. Provider is not properly set up');
      console.log('\nPlease configure a provider in Settings before testing.');
    }

    console.log('\n✅ Test completed');
    console.log('✅ All screenshots saved to test-results/');
  });
});

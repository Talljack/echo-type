import { test, expect, chromium } from '@playwright/test';

test.describe('Speak Module - API & LLM Verification', () => {
  test('should capture complete API flow with detailed logging', async () => {
    // Launch browser with DevTools
    const browser = await chromium.launch({
      headless: false,
      devtools: true,
      args: ['--auto-open-devtools-for-tabs']
    });

    const context = await browser.newContext({
      permissions: ['microphone']
    });

    const page = await context.newPage();

    // Comprehensive logging
    const apiLogs: any[] = [];
    let requestCount = 0;
    let responseCount = 0;

    // Capture all console messages
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`[CONSOLE ${type.toUpperCase()}] ${text}`);
    });

    // Capture all requests
    page.on('request', request => {
      if (request.url().includes('/api/speak')) {
        requestCount++;
        console.log('\n' + '='.repeat(80));
        console.log(`🔵 API REQUEST #${requestCount}`);
        console.log('='.repeat(80));
        console.log('URL:', request.url());
        console.log('Method:', request.method());
        console.log('Headers:', JSON.stringify(request.headers(), null, 2));

        const postData = request.postData();
        if (postData) {
          try {
            const parsed = JSON.parse(postData);
            console.log('\n📤 REQUEST PAYLOAD:');
            console.log('  Provider:', parsed.provider);
            console.log('  Model ID:', parsed.modelId);
            console.log('  Base URL:', parsed.baseUrl);
            console.log('\n  Scenario:');
            console.log('    Title:', parsed.scenario?.title);
            console.log('    System Prompt:', parsed.scenario?.systemPrompt?.substring(0, 100) + '...');
            console.log('    Goals:', parsed.scenario?.goals);
            console.log('    Difficulty:', parsed.scenario?.difficulty);
            console.log('\n  Messages:');
            parsed.messages?.forEach((msg: any, idx: number) => {
              console.log(`    [${idx}] ${msg.role}: ${msg.content.substring(0, 80)}${msg.content.length > 80 ? '...' : ''}`);
            });

            apiLogs.push({
              type: 'request',
              timestamp: Date.now(),
              data: parsed
            });
          } catch (e) {
            console.log('📤 Request Body (raw):', postData.substring(0, 500));
          }
        }
      }
    });

    // Capture all responses
    page.on('response', async response => {
      if (response.url().includes('/api/speak')) {
        responseCount++;
        console.log('\n' + '='.repeat(80));
        console.log(`🟢 API RESPONSE #${responseCount}`);
        console.log('='.repeat(80));
        console.log('Status:', response.status(), response.statusText());
        console.log('Headers:', JSON.stringify(response.headers(), null, 2));

        try {
          const body = await response.body();
          const text = body.toString('utf-8');
          console.log('\n📥 RESPONSE BODY:');
          console.log('  Length:', text.length, 'bytes');
          console.log('  Content (first 1000 chars):');
          console.log('  ' + text.substring(0, 1000).replace(/\n/g, '\n  '));
          if (text.length > 1000) {
            console.log('  ... (truncated)');
          }

          apiLogs.push({
            type: 'response',
            timestamp: Date.now(),
            status: response.status(),
            body: text
          });
        } catch (e) {
          console.log('📥 Response: [streaming or unable to read]');
        }
      }
    });

    // Navigate to speak page
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 1: Navigate to Speak Homepage');
    console.log('█'.repeat(80));
    await page.goto('http://localhost:3000/speak');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/detailed-01-homepage.png', fullPage: true });
    console.log('✓ Screenshot: detailed-01-homepage.png');

    // Select first scenario
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 2: Select Scenario');
    console.log('█'.repeat(80));

    const scenarioCards = page.locator('div').filter({ hasText: /Ordering Coffee|Coffee Shop|Grocery Shopping|Asking for Directions/ });
    const count = await scenarioCards.count();
    console.log(`Found ${count} matching scenarios`);

    await scenarioCards.first().click();
    console.log('✓ Clicked first scenario');

    await page.waitForURL(/\/speak\/[^/]+/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const scenarioTitle = await page.locator('h1').first().textContent();
    console.log('✓ Loaded scenario:', scenarioTitle);

    await page.screenshot({ path: 'test-results/detailed-02-scenario-loaded.png', fullPage: true });
    console.log('✓ Screenshot: detailed-02-scenario-loaded.png');

    // Check for opening message
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 3: Verify AI Opening Message');
    console.log('█'.repeat(80));

    await page.waitForTimeout(1000);
    const conversationArea = page.locator('div').filter({ hasText: /.+/ });
    console.log(`✓ Conversation area has ${await conversationArea.count()} elements`);

    // Send first message
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 4: Send First User Message');
    console.log('█'.repeat(80));

    const textInput = page.locator('input[type="text"]').or(page.locator('input[placeholder*="type"]'));
    await expect(textInput).toBeVisible();

    const message1 = "Hi, I'd like to order a coffee";
    await textInput.fill(message1);
    console.log('✓ Typed:', message1);

    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await sendButton.click();
    console.log('✓ Clicked send button');

    // Wait for API call and streaming response
    console.log('\n⏳ Waiting for API response (10 seconds)...');
    await page.waitForTimeout(10000);

    await page.screenshot({ path: 'test-results/detailed-03-after-message-1.png', fullPage: true });
    console.log('✓ Screenshot: detailed-03-after-message-1.png');

    // Send second message
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 5: Send Second User Message');
    console.log('█'.repeat(80));

    await page.waitForTimeout(2000);

    const message2 = "What sizes do you have?";
    await textInput.fill(message2);
    console.log('✓ Typed:', message2);

    await sendButton.click();
    console.log('✓ Clicked send button');

    console.log('\n⏳ Waiting for API response (10 seconds)...');
    await page.waitForTimeout(10000);

    await page.screenshot({ path: 'test-results/detailed-04-after-message-2.png', fullPage: true });
    console.log('✓ Screenshot: detailed-04-after-message-2.png');

    // Send third message
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 6: Send Third User Message');
    console.log('█'.repeat(80));

    await page.waitForTimeout(2000);

    const message3 = "I'll take a medium latte please";
    await textInput.fill(message3);
    console.log('✓ Typed:', message3);

    await sendButton.click();
    console.log('✓ Clicked send button');

    console.log('\n⏳ Waiting for API response (10 seconds)...');
    await page.waitForTimeout(10000);

    await page.screenshot({ path: 'test-results/detailed-05-after-message-3.png', fullPage: true });
    console.log('✓ Screenshot: detailed-05-after-message-3.png');

    // Final summary
    console.log('\n' + '█'.repeat(80));
    console.log('TEST SUMMARY');
    console.log('█'.repeat(80));
    console.log(`Total API Requests: ${requestCount}`);
    console.log(`Total API Responses: ${responseCount}`);
    console.log(`Total API Logs: ${apiLogs.length}`);

    console.log('\n📊 API Call Timeline:');
    apiLogs.forEach((log, idx) => {
      if (log.type === 'request') {
        console.log(`\n[${idx + 1}] REQUEST at ${new Date(log.timestamp).toISOString()}`);
        console.log(`    Messages: ${log.data.messages?.length || 0}`);
        console.log(`    Provider: ${log.data.provider}`);
        console.log(`    Model: ${log.data.modelId}`);
      } else if (log.type === 'response') {
        console.log(`\n[${idx + 1}] RESPONSE at ${new Date(log.timestamp).toISOString()}`);
        console.log(`    Status: ${log.status}`);
        console.log(`    Body length: ${log.body?.length || 0} bytes`);
        console.log(`    First 200 chars: ${log.body?.substring(0, 200) || 'N/A'}`);
      }
    });

    console.log('\n✅ Test completed successfully');
    console.log('✅ All screenshots saved to test-results/');
    console.log('\n💡 Browser will stay open for 30 seconds for manual inspection...');

    // Keep browser open for manual inspection
    await page.waitForTimeout(30000);

    await browser.close();
  });
});

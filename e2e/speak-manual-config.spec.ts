import { test } from '@playwright/test';

test.describe('Speak Module - Manual Configuration & Full LLM Test', () => {
  test('should manually configure Ollama and test complete LLM conversation', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);

    // Track everything
    const apiCalls: any[] = [];
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(text);
      if (msg.type() === 'error') {
        console.log('❌', text);
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
            console.log('  Length:', text.length, 'bytes');
            console.log('  Content:', text.substring(0, 300));
            apiCalls.push({ type: 'response', status: 200, body: text, timestamp: Date.now() });
          } catch (e) {
            console.log('  [Streaming]');
          }
        } else {
          const errorBody = await response.text().catch(() => 'Could not read');
          console.log('  ❌ Error:', errorBody);
          apiCalls.push({ type: 'error', status: response.status(), error: errorBody, timestamp: Date.now() });
        }
      }
    });

    // Step 1: Go to Settings and configure Ollama
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 1: Navigate to Settings');
    console.log('█'.repeat(80));

    await page.goto('http://localhost:3000/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/manual-01-settings.png', fullPage: true });

    // Look for Ollama option
    console.log('\n🔍 Looking for Ollama provider option...');

    // Try to find and click Ollama provider
    const ollamaButton = page.locator('button, div').filter({ hasText: /ollama/i }).first();
    const hasOllama = await ollamaButton.isVisible().catch(() => false);

    if (hasOllama) {
      console.log('✅ Found Ollama option');
      await ollamaButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Clicked Ollama');

      await page.screenshot({ path: 'test-results/manual-02-ollama-selected.png', fullPage: true });
    } else {
      console.log('⚠️  Ollama option not found in UI');
      console.log('⚠️  Will try to configure via localStorage');
    }

    // Force configure via localStorage
    console.log('\n📝 Configuring Ollama via localStorage...');
    await page.evaluate(() => {
      const config = {
        providers: {
          ollama: {
            providerId: 'ollama',
            auth: { type: 'none' },
            selectedModelId: 'llama3.2',
            baseUrl: 'http://localhost:11434'
          }
        },
        activeProviderId: 'ollama'
      };
      localStorage.setItem('echotype_provider_config', JSON.stringify(config));
      console.log('✅ Ollama configured in localStorage');
    });

    // Verify configuration
    const config = await page.evaluate(() => {
      const raw = localStorage.getItem('echotype_provider_config');
      return raw ? JSON.parse(raw) : null;
    });

    console.log('✅ Configuration verified:');
    console.log('  Active Provider:', config?.activeProviderId);
    console.log('  Model:', config?.providers?.ollama?.selectedModelId);
    console.log('  Base URL:', config?.providers?.ollama?.baseUrl);

    // Step 2: Navigate to Speak
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 2: Navigate to Speak Page');
    console.log('█'.repeat(80));

    await page.goto('http://localhost:3000/speak');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/manual-03-speak-homepage.png', fullPage: true });
    console.log('✅ Speak homepage loaded');

    // Step 3: Select "Ordering Coffee" scenario
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 3: Select Scenario');
    console.log('█'.repeat(80));

    // Find Ordering Coffee scenario
    const coffeeScenario = page.locator('text=/Ordering Coffee/i').or(
      page.locator('div').filter({ hasText: /Coffee Shop|Ordering Coffee/i })
    ).first();

    const hasCoffee = await coffeeScenario.isVisible().catch(() => false);

    if (hasCoffee) {
      await coffeeScenario.click();
      console.log('✅ Clicked "Ordering Coffee" scenario');
    } else {
      // Click any scenario
      const anyScenario = page.locator('div').filter({ hasText: /beginner|intermediate/i }).first();
      await anyScenario.click();
      console.log('✅ Clicked first available scenario');
    }

    await page.waitForURL(/\/speak\/[^/]+/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const scenarioTitle = await page.locator('h1').first().textContent();
    console.log('✅ Loaded scenario:', scenarioTitle);

    await page.screenshot({ path: 'test-results/manual-04-scenario-loaded.png', fullPage: true });

    // Step 4: Send first message
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 4: Send First Message');
    console.log('█'.repeat(80));

    const textInput = page.locator('input[type="text"]').or(page.locator('input[placeholder*="type"]'));
    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();

    const message1 = "Hi, I'd like to order a coffee";
    await textInput.fill(message1);
    console.log('✅ Typed:', message1);

    await sendButton.click();
    console.log('✅ Clicked send');

    console.log('\n⏳ Waiting 20 seconds for LLM response...');
    await page.waitForTimeout(20000);

    await page.screenshot({ path: 'test-results/manual-05-after-message-1.png', fullPage: true });

    // Check if we got a response
    if (apiCalls.length > 0) {
      console.log('✅ API activity detected!');
    } else {
      console.log('⚠️  No API activity yet');
    }

    // Step 5: Send second message
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 5: Send Second Message');
    console.log('█'.repeat(80));

    await page.waitForTimeout(3000);

    const message2 = "What sizes do you have?";
    await textInput.fill(message2);
    console.log('✅ Typed:', message2);

    await sendButton.click();
    console.log('✅ Clicked send');

    console.log('\n⏳ Waiting 20 seconds for LLM response...');
    await page.waitForTimeout(20000);

    await page.screenshot({ path: 'test-results/manual-06-after-message-2.png', fullPage: true });

    // Step 6: Send third message
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 6: Send Third Message');
    console.log('█'.repeat(80));

    await page.waitForTimeout(3000);

    const message3 = "I'll take a medium latte, please";
    await textInput.fill(message3);
    console.log('✅ Typed:', message3);

    await sendButton.click();
    console.log('✅ Clicked send');

    console.log('\n⏳ Waiting 20 seconds for LLM response...');
    await page.waitForTimeout(20000);

    await page.screenshot({ path: 'test-results/manual-07-after-message-3.png', fullPage: true });

    // Final screenshot
    await page.screenshot({ path: 'test-results/manual-08-final.png', fullPage: true });

    // Summary
    console.log('\n' + '█'.repeat(80));
    console.log('TEST SUMMARY');
    console.log('█'.repeat(80));

    const requests = apiCalls.filter(c => c.type === 'request');
    const responses = apiCalls.filter(c => c.type === 'response');
    const errors = apiCalls.filter(c => c.type === 'error');

    console.log('API Requests:', requests.length);
    console.log('API Responses:', responses.length);
    console.log('API Errors:', errors.length);

    console.log('\n' + '═'.repeat(80));
    console.log('DETAILED LOG');
    console.log('═'.repeat(80));

    apiCalls.forEach((call, idx) => {
      if (call.type === 'request') {
        console.log(`\n[${idx + 1}] 🔵 REQUEST`);
        console.log('  Provider:', call.data.provider);
        console.log('  Model:', call.data.modelId);
        console.log('  Scenario:', call.data.scenario?.title);
        console.log('  Messages:', call.data.messages?.length);
        call.data.messages?.forEach((msg: any, i: number) => {
          console.log(`    [${i}] ${msg.role}: ${msg.content.substring(0, 80)}`);
        });
      } else if (call.type === 'response') {
        console.log(`\n[${idx + 1}] 🟢 RESPONSE`);
        console.log('  Status:', call.status);
        console.log('  Body:', call.body?.substring(0, 500));
      } else if (call.type === 'error') {
        console.log(`\n[${idx + 1}] ❌ ERROR`);
        console.log('  Status:', call.status);
        console.log('  Error:', call.error);
      }
    });

    // Final verdict
    console.log('\n' + '═'.repeat(80));
    console.log('FINAL VERDICT');
    console.log('═'.repeat(80));

    if (requests.length > 0 && responses.length > 0) {
      console.log('✅ SUCCESS: API integration working!');
      console.log('✅ LLM responses received');
      console.log('✅ Conversation flow functional');
    } else if (requests.length > 0) {
      console.log('⚠️  PARTIAL: API requests sent but no responses');
      console.log('⚠️  Check Ollama service and model availability');
    } else {
      console.log('❌ FAILED: No API requests detected');
      console.log('❌ Provider configuration may not be working');
    }

    console.log('\n✅ Test completed');
    console.log('📸 Screenshots saved to test-results/manual-*.png');
  });
});

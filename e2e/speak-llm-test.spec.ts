import { test } from '@playwright/test';

test.describe('Speak Module - Complete LLM Test with Ollama', () => {
  test('should configure Ollama and test full conversation with LLM', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);

    // Track API calls
    const apiCalls: any[] = [];
    let llmResponseReceived = false;

    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error') {
        console.log('❌ [CONSOLE ERROR]', msg.text());
      }
    });

    page.on('request', request => {
      if (request.url().includes('/api/speak')) {
        console.log('\n' + '🔵'.repeat(40));
        console.log('API REQUEST DETECTED');
        console.log('🔵'.repeat(40));

        const postData = request.postData();
        if (postData) {
          try {
            const data = JSON.parse(postData);
            console.log('Provider:', data.provider);
            console.log('Model:', data.modelId);
            console.log('Base URL:', data.baseUrl);
            console.log('\nScenario:');
            console.log('  Title:', data.scenario?.title);
            console.log('  Difficulty:', data.scenario?.difficulty);
            console.log('  Goals:', data.scenario?.goals);
            console.log('\nMessages:');
            data.messages?.forEach((msg: any, idx: number) => {
              console.log(`  [${idx}] ${msg.role}: ${msg.content}`);
            });

            apiCalls.push({
              type: 'request',
              timestamp: Date.now(),
              data
            });
          } catch (e) {
            console.log('Request body:', postData.substring(0, 300));
          }
        }
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/speak')) {
        console.log('\n' + '🟢'.repeat(40));
        console.log('API RESPONSE DETECTED');
        console.log('🟢'.repeat(40));
        console.log('Status:', response.status());

        if (response.status() === 200) {
          llmResponseReceived = true;
          try {
            const body = await response.body();
            const text = body.toString('utf-8');
            console.log('Response length:', text.length, 'bytes');
            console.log('\nLLM Response:');
            console.log('─'.repeat(80));
            console.log(text);
            console.log('─'.repeat(80));

            apiCalls.push({
              type: 'response',
              timestamp: Date.now(),
              status: 200,
              body: text
            });
          } catch (e) {
            console.log('Response: [streaming]');
          }
        } else {
          try {
            const errorBody = await response.text();
            console.log('❌ Error Response:', errorBody);
            apiCalls.push({
              type: 'error',
              timestamp: Date.now(),
              status: response.status(),
              error: errorBody
            });
          } catch (e) {
            console.log('❌ Status:', response.status());
          }
        }
      }
    });

    // Step 1: Configure Ollama provider
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 1: Configure Ollama Provider');
    console.log('█'.repeat(80));

    await page.goto('http://localhost:3000/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Set provider config via localStorage
    await page.evaluate(() => {
      const config = {
        providers: {
          ollama: {
            providerId: 'ollama',
            auth: { type: 'none' },
            selectedModelId: 'llama3.2',
            baseUrl: 'http://localhost:11434'
          },
          openai: {
            providerId: 'openai',
            auth: { type: 'none' },
            selectedModelId: 'gpt-4'
          }
        },
        activeProviderId: 'ollama'
      };
      localStorage.setItem('echotype_provider_config', JSON.stringify(config));
      console.log('✅ Configured Ollama provider');
    });

    await page.screenshot({ path: 'test-results/llm-01-settings.png', fullPage: true });
    console.log('✅ Provider configured: Ollama (llama3.2)');

    // Step 2: Navigate to Speak
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 2: Navigate to Speak Page');
    console.log('█'.repeat(80));

    await page.goto('http://localhost:3000/speak');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/llm-02-speak-homepage.png', fullPage: true });
    console.log('✅ Loaded speak homepage');

    // Step 3: Select "Ordering Coffee" scenario
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 3: Select "Ordering Coffee" Scenario');
    console.log('█'.repeat(80));

    const coffeeScenario = page.locator('div').filter({ hasText: /Ordering Coffee|Coffee Shop/i }).first();
    await coffeeScenario.click();
    await page.waitForURL(/\/speak\/[^/]+/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const scenarioTitle = await page.locator('h1').first().textContent();
    console.log('✅ Selected scenario:', scenarioTitle);

    await page.screenshot({ path: 'test-results/llm-03-scenario-loaded.png', fullPage: true });

    // Check for AI opening message
    console.log('\n✅ Waiting for AI opening message...');
    await page.waitForTimeout(1000);

    // Step 4: Send first message
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 4: Send First Message to LLM');
    console.log('█'.repeat(80));

    const textInput = page.locator('input[type="text"]').or(page.locator('input[placeholder*="type"]'));
    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();

    const message1 = "Hi, I'd like a latte please";
    await textInput.fill(message1);
    console.log('✅ User message:', message1);

    await sendButton.click();
    console.log('✅ Sent message');

    console.log('\n⏳ Waiting 15 seconds for LLM response...');
    await page.waitForTimeout(15000);

    await page.screenshot({ path: 'test-results/llm-04-after-message-1.png', fullPage: true });

    // Step 5: Send second message
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 5: Send Second Message');
    console.log('█'.repeat(80));

    await page.waitForTimeout(2000);

    const message2 = "What size would you recommend?";
    await textInput.fill(message2);
    console.log('✅ User message:', message2);

    await sendButton.click();
    console.log('✅ Sent message');

    console.log('\n⏳ Waiting 15 seconds for LLM response...');
    await page.waitForTimeout(15000);

    await page.screenshot({ path: 'test-results/llm-05-after-message-2.png', fullPage: true });

    // Step 6: Send third message
    console.log('\n' + '█'.repeat(80));
    console.log('STEP 6: Send Third Message');
    console.log('█'.repeat(80));

    await page.waitForTimeout(2000);

    const message3 = "I'll take a medium, thanks!";
    await textInput.fill(message3);
    console.log('✅ User message:', message3);

    await sendButton.click();
    console.log('✅ Sent message');

    console.log('\n⏳ Waiting 15 seconds for LLM response...');
    await page.waitForTimeout(15000);

    await page.screenshot({ path: 'test-results/llm-06-after-message-3.png', fullPage: true });

    // Final screenshot
    await page.screenshot({ path: 'test-results/llm-07-final-conversation.png', fullPage: true });

    // Summary
    console.log('\n' + '█'.repeat(80));
    console.log('TEST SUMMARY');
    console.log('█'.repeat(80));

    const requestCount = apiCalls.filter(c => c.type === 'request').length;
    const responseCount = apiCalls.filter(c => c.type === 'response').length;
    const errorCount = apiCalls.filter(c => c.type === 'error').length;

    console.log('Total API Requests:', requestCount);
    console.log('Total API Responses:', responseCount);
    console.log('Total API Errors:', errorCount);
    console.log('LLM Response Received:', llmResponseReceived ? '✅ YES' : '❌ NO');

    console.log('\n' + '═'.repeat(80));
    console.log('DETAILED API CALL LOG');
    console.log('═'.repeat(80));

    apiCalls.forEach((call, idx) => {
      if (call.type === 'request') {
        console.log(`\n[${idx + 1}] 🔵 REQUEST at ${new Date(call.timestamp).toISOString()}`);
        console.log('    Provider:', call.data.provider);
        console.log('    Model:', call.data.modelId);
        console.log('    Scenario:', call.data.scenario?.title);
        console.log('    Messages:', call.data.messages?.length);
        console.log('    Last user message:', call.data.messages?.[call.data.messages.length - 1]?.content);
      } else if (call.type === 'response') {
        console.log(`\n[${idx + 1}] 🟢 RESPONSE at ${new Date(call.timestamp).toISOString()}`);
        console.log('    Status:', call.status);
        console.log('    Body length:', call.body?.length, 'bytes');
        console.log('    LLM Output:', call.body?.substring(0, 200));
        if (call.body?.length > 200) {
          console.log('    ... (truncated)');
        }
      } else if (call.type === 'error') {
        console.log(`\n[${idx + 1}] ❌ ERROR at ${new Date(call.timestamp).toISOString()}`);
        console.log('    Status:', call.status);
        console.log('    Error:', call.error);
      }
    });

    console.log('\n' + '═'.repeat(80));
    console.log('TEST RESULTS');
    console.log('═'.repeat(80));

    if (requestCount > 0 && responseCount > 0) {
      console.log('✅ API Integration: WORKING');
      console.log('✅ LLM Responses: RECEIVED');
      console.log('✅ Conversation Flow: FUNCTIONAL');
    } else if (requestCount > 0 && errorCount > 0) {
      console.log('⚠️  API Integration: PARTIAL');
      console.log('❌ LLM Responses: ERRORS');
      console.log('⚠️  Check error messages above');
    } else {
      console.log('❌ API Integration: NOT WORKING');
      console.log('❌ No API calls detected');
    }

    console.log('\n✅ Test completed');
    console.log('✅ All screenshots saved to test-results/llm-*.png');
  });
});

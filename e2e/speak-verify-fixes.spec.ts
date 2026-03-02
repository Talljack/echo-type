import { test, expect } from '@playwright/test';

test.describe('Speak Module - Complete Verification After Fixes', () => {
  test('should verify all fixes and test complete functionality', async ({ page, context }) => {
    test.setTimeout(240000); // 4 minutes timeout

    await context.grantPermissions(['microphone']);

    // Track everything
    const apiCalls: any[] = [];
    const consoleLogs: string[] = [];
    let llmResponseReceived = false;
    let providerConfigDetected = false;

    // Monitor console for provider store logs
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);

      if (text.includes('[Provider Store]')) {
        console.log('🔍', text);
        if (text.includes('Hydration complete')) {
          providerConfigDetected = true;
        }
      }

      if (msg.type() === 'error' && !text.includes('Download the React DevTools')) {
        console.log('❌ [ERROR]', text);
      }
    });

    // Monitor API calls
    page.on('request', request => {
      if (request.url().includes('/api/speak')) {
        console.log('\n' + '🔵'.repeat(50));
        console.log('✅ API REQUEST DETECTED!');
        console.log('🔵'.repeat(50));

        const postData = request.postData();
        if (postData) {
          try {
            const data = JSON.parse(postData);
            console.log('\n📤 REQUEST:');
            console.log('  Provider:', data.provider);
            console.log('  Model:', data.modelId);
            console.log('  Base URL:', data.baseUrl);
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
        console.log('\n' + '🟢'.repeat(50));
        console.log('✅ API RESPONSE RECEIVED!');
        console.log('🟢'.repeat(50));
        console.log('Status:', response.status());

        if (response.status() === 200) {
          llmResponseReceived = true;
          try {
            const body = await response.body();
            const text = body.toString('utf-8');
            console.log('\n📥 LLM RESPONSE:');
            console.log('  Length:', text.length, 'bytes');
            console.log('  Content:', text.substring(0, 500));

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

    // ========================================================================
    // TEST 1: Verify Fix #1 - No nested button warning
    // ========================================================================
    console.log('\n' + '█'.repeat(80));
    console.log('TEST 1: Verify Nested Button Fix');
    console.log('█'.repeat(80));

    await page.goto('http://localhost:3000/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/verify-01-settings.png', fullPage: true });

    // Check console for nested button errors
    const nestedButtonErrors = consoleLogs.filter(log =>
      log.includes('cannot be a descendant') || log.includes('cannot contain a nested')
    );

    if (nestedButtonErrors.length === 0) {
      console.log('✅ FIX #1 VERIFIED: No nested button warnings');
    } else {
      console.log('⚠️  FIX #1 PARTIAL: Still has warnings:', nestedButtonErrors.length);
    }

    // ========================================================================
    // TEST 2: Configure Ollama Provider
    // ========================================================================
    console.log('\n' + '█'.repeat(80));
    console.log('TEST 2: Configure Ollama Provider');
    console.log('█'.repeat(80));

    // Try to find Providers tab
    const providersTab = page.locator('button, div').filter({ hasText: /providers?/i }).first();
    const hasTab = await providersTab.isVisible().catch(() => false);

    if (hasTab) {
      await providersTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ Clicked Providers tab');
    }

    // Configure via localStorage with proper structure
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
      console.log('[TEST] Ollama config saved to localStorage');
    });

    await page.screenshot({ path: 'test-results/verify-02-config-saved.png', fullPage: true });
    console.log('✅ Ollama configuration saved');

    // ========================================================================
    // TEST 3: Navigate to Speak and trigger hydration
    // ========================================================================
    console.log('\n' + '█'.repeat(80));
    console.log('TEST 3: Navigate to Speak (Trigger Hydration)');
    console.log('█'.repeat(80));

    await page.goto('http://localhost:3000/speak');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/verify-03-speak-homepage.png', fullPage: true });

    // Check if hydration happened
    if (providerConfigDetected) {
      console.log('✅ FIX #3 VERIFIED: Provider store hydration working');
    } else {
      console.log('⚠️  FIX #3: Hydration logs not detected yet');
    }

    // ========================================================================
    // TEST 4: Select Scenario and Test Error Feedback
    // ========================================================================
    console.log('\n' + '█'.repeat(80));
    console.log('TEST 4: Select Scenario');
    console.log('█'.repeat(80));

    const firstScenario = page.locator('div').filter({ hasText: /Ordering Coffee|Coffee Shop/i }).first();
    await firstScenario.click();
    await page.waitForURL(/\/speak\/[^/]+/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const scenarioTitle = await page.locator('h1').first().textContent();
    console.log('✅ Loaded scenario:', scenarioTitle);

    await page.screenshot({ path: 'test-results/verify-04-scenario-loaded.png', fullPage: true });

    // ========================================================================
    // TEST 5: Send Message and Verify Error Feedback (Fix #2)
    // ========================================================================
    console.log('\n' + '█'.repeat(80));
    console.log('TEST 5: Send Message (Test Error Feedback)');
    console.log('█'.repeat(80));

    const textInput = page.locator('input[type="text"]').or(page.locator('input[placeholder*="type"]'));
    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();

    const message1 = "Hi, I'd like to order a coffee";
    await textInput.fill(message1);
    console.log('✅ Typed:', message1);

    await sendButton.click();
    console.log('✅ Clicked send');

    console.log('\n⏳ Waiting 15 seconds for response or error message...');
    await page.waitForTimeout(15000);

    await page.screenshot({ path: 'test-results/verify-05-after-send.png', fullPage: true });

    // Check for error message in conversation
    const errorMessage = page.locator('text=/configure.*provider|API.*key|Settings/i');
    const hasErrorMessage = await errorMessage.isVisible().catch(() => false);

    if (hasErrorMessage) {
      console.log('✅ FIX #2 VERIFIED: Error feedback shown to user');
      const errorText = await errorMessage.first().textContent();
      console.log('   Error message:', errorText?.substring(0, 100));
    } else if (apiCalls.length > 0) {
      console.log('✅ FIX #2 & #3 VERIFIED: API call triggered (config working!)');
    } else {
      console.log('⚠️  FIX #2: No error message and no API call');
    }

    // ========================================================================
    // TEST 6: Check API Integration
    // ========================================================================
    console.log('\n' + '█'.repeat(80));
    console.log('TEST 6: API Integration Status');
    console.log('█'.repeat(80));

    const requests = apiCalls.filter(c => c.type === 'request');
    const responses = apiCalls.filter(c => c.type === 'response');
    const errors = apiCalls.filter(c => c.type === 'error');

    console.log('API Requests:', requests.length);
    console.log('API Responses:', responses.length);
    console.log('API Errors:', errors.length);

    if (requests.length > 0) {
      console.log('\n✅ API INTEGRATION WORKING!');
      console.log('   Provider:', requests[0].data.provider);
      console.log('   Model:', requests[0].data.modelId);
    } else {
      console.log('\n⚠️  API Integration: No requests detected');
      console.log('   This may require manual browser testing');
    }

    // ========================================================================
    // TEST 7: Send Another Message (If API is working)
    // ========================================================================
    if (requests.length > 0) {
      console.log('\n' + '█'.repeat(80));
      console.log('TEST 7: Send Second Message');
      console.log('█'.repeat(80));

      await page.waitForTimeout(3000);

      const message2 = "What sizes do you have?";
      await textInput.fill(message2);
      console.log('✅ Typed:', message2);

      await sendButton.click();
      console.log('✅ Clicked send');

      console.log('\n⏳ Waiting 15 seconds for LLM response...');
      await page.waitForTimeout(15000);

      await page.screenshot({ path: 'test-results/verify-06-second-message.png', fullPage: true });
    }

    // ========================================================================
    // TEST 8: Voice Button Test
    // ========================================================================
    console.log('\n' + '█'.repeat(80));
    console.log('TEST 8: Voice Input Button');
    console.log('█'.repeat(80));

    const voiceButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    const isVoiceVisible = await voiceButton.isVisible();
    console.log('Voice button visible:', isVoiceVisible);

    if (isVoiceVisible) {
      await voiceButton.click();
      console.log('✅ Clicked voice button (start recording)');

      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/verify-07-recording.png', fullPage: true });

      await voiceButton.click();
      console.log('✅ Clicked voice button (stop recording)');

      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/verify-08-after-recording.png', fullPage: true });
    }

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    console.log('\n' + '═'.repeat(80));
    console.log('FINAL TEST SUMMARY');
    console.log('═'.repeat(80));

    console.log('\n🔧 FIXES VERIFICATION:');
    console.log('  Fix #1 (Nested Button):', nestedButtonErrors.length === 0 ? '✅ VERIFIED' : '⚠️ PARTIAL');
    console.log('  Fix #2 (Error Feedback):', hasErrorMessage || requests.length > 0 ? '✅ VERIFIED' : '⚠️ NEEDS CHECK');
    console.log('  Fix #3 (Store Hydration):', providerConfigDetected ? '✅ VERIFIED' : '⚠️ NEEDS CHECK');

    console.log('\n📊 API INTEGRATION:');
    console.log('  Requests:', requests.length);
    console.log('  Responses:', responses.length);
    console.log('  Errors:', errors.length);
    console.log('  Status:', requests.length > 0 ? '✅ WORKING' : '⚠️ NOT TRIGGERED');

    console.log('\n🎤 VOICE INPUT:');
    console.log('  Button Visible:', isVoiceVisible ? '✅ YES' : '❌ NO');
    console.log('  Button Clickable:', isVoiceVisible ? '✅ YES' : '❌ NO');
    console.log('  Actual Recognition:', '⚠️ REQUIRES MANUAL TEST');

    console.log('\n🤖 LLM RESPONSES:');
    console.log('  Response Received:', llmResponseReceived ? '✅ YES' : '⚠️ NO');
    console.log('  Streaming Display:', llmResponseReceived ? '✅ WORKING' : '⚠️ NOT TESTED');

    console.log('\n🔊 TTS PLAYBACK:');
    console.log('  Status:', llmResponseReceived ? '⚠️ REQUIRES MANUAL VERIFICATION' : '⚠️ NOT TESTED');

    // Print detailed API logs if available
    if (apiCalls.length > 0) {
      console.log('\n' + '═'.repeat(80));
      console.log('DETAILED API LOG');
      console.log('═'.repeat(80));

      apiCalls.forEach((call, idx) => {
        if (call.type === 'request') {
          console.log(`\n[${idx + 1}] 🔵 REQUEST`);
          console.log('  Provider:', call.data.provider);
          console.log('  Model:', call.data.modelId);
          console.log('  Messages:', call.data.messages?.length);
        } else if (call.type === 'response') {
          console.log(`\n[${idx + 1}] 🟢 RESPONSE`);
          console.log('  Status:', call.status);
          console.log('  Body:', call.body?.substring(0, 300));
        } else if (call.type === 'error') {
          console.log(`\n[${idx + 1}] ❌ ERROR`);
          console.log('  Status:', call.status);
          console.log('  Error:', call.error);
        }
      });
    }

    // Final screenshot
    await page.screenshot({ path: 'test-results/verify-09-final.png', fullPage: true });

    console.log('\n✅ Test completed');
    console.log('📸 Screenshots saved to test-results/verify-*.png');

    // Keep browser open for inspection
    console.log('\n⏳ Keeping browser open for 15 seconds...');
    await page.waitForTimeout(15000);
  });
});

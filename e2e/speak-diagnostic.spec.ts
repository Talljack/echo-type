import { test, expect } from '@playwright/test';

test.describe('Speak Module - Diagnostic Test', () => {
  test('should diagnose API configuration and errors', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);

    // Capture all console messages including errors
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      consoleLogs.push(text);
      console.log(text);
    });

    // Capture page errors
    page.on('pageerror', error => {
      console.log('❌ PAGE ERROR:', error.message);
      consoleLogs.push(`[PAGE ERROR] ${error.message}`);
    });

    // Capture failed requests
    page.on('requestfailed', request => {
      console.log('❌ REQUEST FAILED:', request.url(), request.failure()?.errorText);
    });

    // Monitor API calls
    let apiRequestDetected = false;
    let apiResponseDetected = false;
    let apiError: string | null = null;

    page.on('request', request => {
      if (request.url().includes('/api/speak')) {
        apiRequestDetected = true;
        console.log('\n✅ API REQUEST DETECTED');
        console.log('URL:', request.url());
        console.log('Method:', request.method());

        const postData = request.postData();
        if (postData) {
          try {
            const data = JSON.parse(postData);
            console.log('Provider:', data.provider);
            console.log('Model:', data.modelId);
            console.log('Messages count:', data.messages?.length);
          } catch (e) {
            console.log('Post data:', postData.substring(0, 200));
          }
        }
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/speak')) {
        apiResponseDetected = true;
        console.log('\n✅ API RESPONSE DETECTED');
        console.log('Status:', response.status());

        if (response.status() !== 200) {
          try {
            const body = await response.text();
            apiError = body;
            console.log('❌ ERROR RESPONSE:', body);
          } catch (e) {
            console.log('❌ Could not read error response');
          }
        } else {
          console.log('✅ Response status OK');
        }
      }
    });

    // Navigate to speak page
    console.log('\n=== Step 1: Navigate to Speak ===');
    await page.goto('http://localhost:3000/speak');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/diag-01-homepage.png', fullPage: true });

    // Click first scenario
    console.log('\n=== Step 2: Select Scenario ===');
    const firstScenario = page.locator('div').filter({ hasText: /Ordering Coffee|Coffee Shop|Grocery Shopping/ }).first();
    await firstScenario.click();
    await page.waitForURL(/\/speak\/[^/]+/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const scenarioTitle = await page.locator('h1').first().textContent();
    console.log('Scenario:', scenarioTitle);

    await page.screenshot({ path: 'test-results/diag-02-scenario.png', fullPage: true });

    // Check for error messages on page
    console.log('\n=== Step 3: Check for UI Errors ===');
    const errorTexts = await page.locator('text=/error|failed|no api key|not configured/i').allTextContents();
    if (errorTexts.length > 0) {
      console.log('⚠️  Found error messages on page:');
      errorTexts.forEach(text => console.log('  -', text));
    } else {
      console.log('✅ No error messages visible on page');
    }

    // Try to send a message
    console.log('\n=== Step 4: Send Test Message ===');
    const textInput = page.locator('input[type="text"]').or(page.locator('input[placeholder*="type"]'));

    if (await textInput.isVisible()) {
      console.log('✅ Text input is visible');

      await textInput.fill('Hello, test message');
      console.log('✅ Typed test message');

      const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();

      if (await sendButton.isEnabled()) {
        console.log('✅ Send button is enabled');
        await sendButton.click();
        console.log('✅ Clicked send button');

        // Wait for potential API call
        console.log('⏳ Waiting 8 seconds for API call...');
        await page.waitForTimeout(8000);

        await page.screenshot({ path: 'test-results/diag-03-after-send.png', fullPage: true });
      } else {
        console.log('❌ Send button is disabled');
      }
    } else {
      console.log('❌ Text input is not visible');
    }

    // Check localStorage for provider config
    console.log('\n=== Step 5: Check Provider Configuration ===');
    const providerConfig = await page.evaluate(() => {
      const config = localStorage.getItem('echotype_provider_config');
      return config ? JSON.parse(config) : null;
    });

    if (providerConfig) {
      console.log('Provider Config:');
      console.log('  Active Provider:', providerConfig.activeProviderId);

      const activeProvider = providerConfig.providers?.[providerConfig.activeProviderId];
      if (activeProvider) {
        console.log('  Selected Model:', activeProvider.selectedModelId);
        console.log('  Auth Type:', activeProvider.auth?.type);
        console.log('  Has API Key:', activeProvider.auth?.apiKey ? 'YES (hidden)' : 'NO');
        console.log('  Has Access Token:', activeProvider.auth?.accessToken ? 'YES (hidden)' : 'NO');
        console.log('  Base URL:', activeProvider.baseUrl || 'default');
      }
    } else {
      console.log('❌ No provider config found in localStorage');
    }

    // Summary
    console.log('\n=== DIAGNOSTIC SUMMARY ===');
    console.log('API Request Detected:', apiRequestDetected ? '✅ YES' : '❌ NO');
    console.log('API Response Detected:', apiResponseDetected ? '✅ YES' : '❌ NO');
    console.log('API Error:', apiError || 'None');
    console.log('Console Logs Count:', consoleLogs.length);

    // Print all console logs
    console.log('\n=== ALL CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));

    // Check if API was called
    if (!apiRequestDetected) {
      console.log('\n⚠️  WARNING: No API request was detected!');
      console.log('Possible reasons:');
      console.log('  1. No API key configured');
      console.log('  2. Provider not properly configured');
      console.log('  3. JavaScript error preventing API call');
      console.log('  4. Message not actually sent');
    }

    // Save diagnostic report
    const report = {
      apiRequestDetected,
      apiResponseDetected,
      apiError,
      providerConfig,
      consoleLogs,
      timestamp: new Date().toISOString()
    };

    await page.evaluate((reportData) => {
      console.log('=== DIAGNOSTIC REPORT ===');
      console.log(JSON.stringify(reportData, null, 2));
    }, report);
  });
});

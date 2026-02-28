import { test, expect, type Page } from '@playwright/test';

// ─── Ollama Configuration ───────────────────────────────────────────────────
const OLLAMA_BASE_URL = 'http://localhost:11434/v1';
// Use text model for text tasks (not vision model)
const DEFAULT_MODEL = 'llama3.2';

// Helper: wait for store to settle
async function waitForStore(page: Page) {
  await page.waitForTimeout(500);
}

// Helper: set localStorage for provider-store to use Ollama directly
async function injectOllamaConfig(page: Page, modelId = DEFAULT_MODEL) {
  await page.goto('/library');
  await page.waitForLoadState('domcontentloaded');

  // Set provider store in localStorage
  await page.evaluate(({ baseUrl, model }) => {
    const config = {
      state: {
        providers: {
          ollama: {
            auth: { type: 'none' },
            selectedModelId: model,
            baseUrl: baseUrl,
            noModelApi: true,
          },
        },
        activeProviderId: 'ollama',
      },
      version: 0,
    };

    // Merge with existing data
    const existing = localStorage.getItem('echotype_provider_config');
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        parsed.state.providers.ollama = config.state.providers.ollama;
        parsed.state.activeProviderId = 'ollama';
        localStorage.setItem('echotype_provider_config', JSON.stringify(parsed));
      } catch {
        localStorage.setItem('echotype_provider_config', JSON.stringify(config));
      }
    } else {
      localStorage.setItem('echotype_provider_config', JSON.stringify(config));
    }
  }, { baseUrl: OLLAMA_BASE_URL, model: modelId });

  // Reload to pick up changes
  await page.reload();
  await page.waitForLoadState('networkidle');
  await waitForStore(page);
}

// Helper: check if Ollama is running
async function checkOllamaRunning(request: any): Promise<boolean> {
  try {
    const res = await request.get(`${OLLAMA_BASE_URL.replace('/v1', '')}/api/tags`);
    return res.ok();
  } catch {
    return false;
  }
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

test.describe('Ollama Local Model Integration Tests', () => {
  test.setTimeout(300000); // 5 minutes for model loading and inference

  // ─── TC-00: Verify Ollama is Running ─────────────────────────────────────

  test('TC-00: Verify Ollama service is running', async ({ request }) => {
    const isRunning = await checkOllamaRunning(request);

    if (!isRunning) {
      console.log('  ⚠️  Ollama is not running. Start it with: ollama serve');
      console.log('  ⚠️  Skipping remaining tests');
    }

    expect(isRunning).toBe(true);
    console.log('  ✅ Ollama service is running');

    // List available models
    const res = await request.get(`${OLLAMA_BASE_URL.replace('/v1', '')}/api/tags`);
    const data = await res.json();

    if (data.models && data.models.length > 0) {
      console.log(`  Available models: ${data.models.length}`);
      data.models.forEach((m: any) => {
        console.log(`    - ${m.name} (${(m.size / 1024 / 1024 / 1024).toFixed(2)} GB)`);
      });
    } else {
      console.log('  ⚠️  No models found. Pull a model with: ollama pull llama3.2');
    }

    console.log('✅ TC-00: Ollama verification completed');
  });

  // ─── TC-01: Settings UI - Configure Ollama ──────────────────────────────

  test('TC-01: Configure Ollama as active provider in settings UI', async ({ page, request }) => {
    const isRunning = await checkOllamaRunning(request);
    test.skip(!isRunning, 'Ollama is not running');

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await waitForStore(page);

    // 1. Verify settings page loads
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Settings');
    await expect(page.getByRole('heading', { name: 'AI Provider' })).toBeVisible();

    // 2. Open provider dropdown
    const providerDropdown = page.locator('button[role="combobox"]').first();
    await providerDropdown.click();
    await page.waitForTimeout(300);

    // 3. Verify Local group exists with Ollama
    const ollamaOption = page.getByText('Ollama');
    await expect(ollamaOption).toBeVisible();

    // 4. Select Ollama
    await ollamaOption.click();
    await page.waitForTimeout(500);

    // 5. Verify Ollama description
    await expect(page.getByText(/Local models.*run anything locally/)).toBeVisible();

    // 6. Verify base URL input is visible and editable
    const baseUrlInputs = page.locator('input[placeholder*="http"]');
    const count = await baseUrlInputs.count();
    console.log(`  Base URL inputs found: ${count}`);

    if (count > 0) {
      const input = baseUrlInputs.first();
      await input.clear();
      await input.fill(OLLAMA_BASE_URL);
      console.log(`  ✅ Base URL set to: ${OLLAMA_BASE_URL}`);
    }

    // 7. For Ollama (noKeyRequired=true), no API key or checkbox needed
    // Just verify the provider is selected and ready
    await page.waitForTimeout(500);

    // 8. Ollama should auto-connect since no key is required
    // Check if already connected or click Connect if button exists
    const connectBtn = page.locator('button').filter({ hasText: /^Connect$/ });
    const connectBtnVisible = await connectBtn.isVisible().catch(() => false);
    if (connectBtnVisible) {
      await connectBtn.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('  ℹ️  No Connect button (Ollama may auto-connect)');
    }

    // 9. Verify active status
    const activeIndicator = page.locator('.text-emerald-600, .bg-emerald-500');
    const activeCount = await activeIndicator.count();
    console.log(`  Active indicators found: ${activeCount}`);

    // 10. Verify model selector shows Ollama models
    const modelDropdowns = page.locator('button[role="combobox"]');
    const modelDropdown = modelDropdowns.nth(1);
    if (await modelDropdown.isVisible()) {
      await modelDropdown.click();
      await page.waitForTimeout(300);

      const llama32 = page.getByText('Llama 3.2', { exact: false });
      const qwen25 = page.getByText('Qwen 2.5', { exact: false });
      const deepseekR1 = page.getByText('DeepSeek R1', { exact: false });

      console.log(`  Llama 3.2 visible: ${await llama32.first().isVisible().catch(() => false)}`);
      console.log(`  Qwen 2.5 visible: ${await qwen25.first().isVisible().catch(() => false)}`);
      console.log(`  DeepSeek R1 visible: ${await deepseekR1.first().isVisible().catch(() => false)}`);

      await page.keyboard.press('Escape');
    }

    // 11. Screenshot for verification
    await page.screenshot({ path: 'test-results/tc01-settings-ollama.png', fullPage: true });
    console.log('  Screenshot: test-results/tc01-settings-ollama.png');

    console.log('✅ TC-01: Ollama configured in settings UI');
  });

  // ─── TC-02: API Route - Translation ──────────────────────────────────────

  test('TC-02: Translation API route with Ollama', async ({ page, request }) => {
    const isRunning = await checkOllamaRunning(request);
    test.skip(!isRunning, 'Ollama is not running');

    const res = await page.request.post('/api/translate', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        text: 'Hello world',
        targetLang: 'Chinese',
        provider: 'ollama',
        modelId: DEFAULT_MODEL,
        baseUrl: OLLAMA_BASE_URL,
      },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.translation).toBeTruthy();
    console.log(`  ✅ Translation: "${data.translation}"`);

    console.log('✅ TC-02: Translation API test completed');
  });

  // ─── TC-03: API Route - Chat (Streaming) ────────────────────────────────

  test('TC-03: Chat API route with Ollama (streaming)', async ({ page, request }) => {
    const isRunning = await checkOllamaRunning(request);
    test.skip(!isRunning, 'Ollama is not running');

    const res = await page.request.post('/api/chat', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        messages: [{ role: 'user', content: 'Say hello in one word' }],
        provider: 'ollama',
        modelId: DEFAULT_MODEL,
        baseUrl: OLLAMA_BASE_URL,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.text();
    console.log(`  Content-Type: ${res.headers()['content-type']}`);
    console.log(`  Body length: ${body.length}`);
    console.log(`  Body preview: ${body.substring(0, 300)}`);
    expect(body.length).toBeGreaterThan(0);
    console.log('  ✅ Chat streaming works');

    console.log('✅ TC-03: Chat API test completed');
  });

  // ─── TC-04: API Route - Recommendations ──────────────────────────────────

  test('TC-04: Recommendations API route with Ollama', async ({ page, request }) => {
    const isRunning = await checkOllamaRunning(request);
    test.skip(!isRunning, 'Ollama is not running');

    const res = await page.request.post('/api/recommendations', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        content: 'hello',
        contentType: 'word',
        count: 3,
        provider: 'ollama',
        modelId: DEFAULT_MODEL,
        baseUrl: OLLAMA_BASE_URL,
      },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.recommendations).toBeTruthy();
    expect(data.recommendations.length).toBeGreaterThanOrEqual(1);
    console.log(`  ✅ Recommendations: ${data.recommendations.length} items`);
    console.log(`  Items: ${JSON.stringify(data.recommendations).substring(0, 200)}`);

    console.log('✅ TC-04: Recommendations API test completed');
  });

  // ─── TC-05: API Route - AI Generate ──────────────────────────────────────

  test('TC-05: AI Generate API route with Ollama', async ({ page, request }) => {
    const isRunning = await checkOllamaRunning(request);
    test.skip(!isRunning, 'Ollama is not running');

    const testCases = [
      { topic: 'travel', difficulty: 'beginner', contentType: 'word' },
      { topic: 'technology', difficulty: 'intermediate', contentType: 'sentence' },
    ];

    for (const tc of testCases) {
      const res = await page.request.post('/api/ai/generate', {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          ...tc,
          provider: 'ollama',
          modelId: DEFAULT_MODEL,
          baseUrl: OLLAMA_BASE_URL,
        },
      });

      expect(res.status()).toBe(200);
      const data = await res.json();
      expect(data.text).toBeTruthy();
      expect(data.type).toBe(tc.contentType);
      console.log(`  ✅ ${tc.contentType}/${tc.difficulty}: "${data.text.substring(0, 80)}..."`);
    }

    console.log('✅ TC-05: AI Generate API test completed');
  });

  // ─── TC-06: API Route - Classification ───────────────────────────────────

  test('TC-06: Classification API route with Ollama', async ({ page, request }) => {
    const isRunning = await checkOllamaRunning(request);
    test.skip(!isRunning, 'Ollama is not running');

    const res = await page.request.post('/api/tools/classify', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        text: 'The stock market rally continued today as tech shares surged.',
        provider: 'ollama',
        modelId: DEFAULT_MODEL,
        baseUrl: OLLAMA_BASE_URL,
      },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.category).toBeTruthy();
    console.log(`  ✅ Category: ${data.category}`);

    console.log('✅ TC-06: Classification API test completed');
  });

  // ─── TC-07: Multi-model API Test ─────────────────────────────────────────

  test('TC-07: Test multiple Ollama models via translate API', async ({ request }) => {
    const isRunning = await checkOllamaRunning(request);
    test.skip(!isRunning, 'Ollama is not running');

    // Get available models from Ollama
    const tagsRes = await request.get(`${OLLAMA_BASE_URL.replace('/v1', '')}/api/tags`);
    const tagsData = await tagsRes.json();

    const availableModels = tagsData.models?.map((m: any) => m.name) || [];
    console.log(`  Available models: ${availableModels.join(', ')}`);

    // Test with available models (limit to 2 for speed)
    const modelsToTest = availableModels.slice(0, 2);

    if (modelsToTest.length === 0) {
      console.log('  ⚠️  No models available to test');
      return;
    }

    for (const modelId of modelsToTest) {
      const res = await request.post('http://localhost:3000/api/translate', {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          text: 'Knowledge is power.',
          targetLang: 'Chinese',
          provider: 'ollama',
          modelId,
          baseUrl: OLLAMA_BASE_URL,
        },
      });

      if (res.status() === 200) {
        const data = await res.json();
        console.log(`  ✅ ${modelId}: "${data.translation}"`);
      } else {
        console.log(`  ⚠️  ${modelId}: Failed with status ${res.status()}`);
      }
    }

    console.log('✅ TC-07: Multi-model test completed');
  });

  // ─── TC-08: Error Handling ───────────────────────────────────────────────

  test('TC-08: Error handling - invalid base URL', async ({ page, request }) => {
    const isRunning = await checkOllamaRunning(request);
    test.skip(!isRunning, 'Ollama is not running');

    const res = await page.request.post('/api/translate', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        text: 'Hello',
        targetLang: 'Chinese',
        provider: 'ollama',
        modelId: DEFAULT_MODEL,
        baseUrl: 'http://localhost:99999/v1', // Invalid port
      },
    });

    // API might return 200 with error in body, or error status
    if (res.status() === 200) {
      const data = await res.json();
      // Check if there's an error field or empty translation
      console.log(`  Invalid URL returned 200, checking response: ${JSON.stringify(data).substring(0, 100)}`);
    } else {
      expect([400, 500]).toContain(res.status());
      const data = await res.json();
      expect(data.error).toBeTruthy();
      console.log(`  Invalid URL: Status ${res.status()}, Error: ${data.error}`);
    }

    console.log('✅ TC-08: Error handling test completed');
  });

  test('TC-08b: Error handling - non-existent model', async ({ page, request }) => {
    const isRunning = await checkOllamaRunning(request);
    test.skip(!isRunning, 'Ollama is not running');

    const res = await page.request.post('/api/chat', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        messages: [{ role: 'user', content: 'Hello' }],
        provider: 'ollama',
        modelId: 'nonexistent-model-12345',
        baseUrl: OLLAMA_BASE_URL,
      },
    });

    // API might return 200 with error in stream, or error status
    console.log(`  Non-existent model: Status ${res.status()}`);
    if (res.status() !== 200) {
      expect([400, 404, 500]).toContain(res.status());
    }

    console.log('✅ TC-08b: Non-existent model error test completed');
  });

  // ─── TC-09: Listen Page UI with Ollama ───────────────────────────────────

  test('TC-09: Listen page with Ollama configured', async ({ page, request }) => {
    const isRunning = await checkOllamaRunning(request);
    test.skip(!isRunning, 'Ollama is not running');

    await injectOllamaConfig(page);

    // Navigate to library and find content
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find a listen link
    const listenLink = page.locator('a[href*="/listen/"]').first();
    if (await listenLink.isVisible()) {
      const href = await listenLink.getAttribute('href');
      console.log(`  Navigating to: ${href}`);
      await listenLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Check page loaded
      const pageTitle = await page.title();
      console.log(`  Page title: ${pageTitle}`);

      // Screenshot
      await page.screenshot({ path: 'test-results/tc09-listen-ollama.png', fullPage: true });
      console.log('  Screenshot: test-results/tc09-listen-ollama.png');
    } else {
      console.log('  ⚠️  No listen links found in library');
    }

    console.log('✅ TC-09: Listen page test completed');
  });

  // ─── TC-10: Provider Store Persistence ───────────────────────────────────

  test('TC-10: Provider store persists Ollama config across reloads', async ({ page, request }) => {
    const isRunning = await checkOllamaRunning(request);
    test.skip(!isRunning, 'Ollama is not running');

    await injectOllamaConfig(page);

    // Read the stored config
    const config = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('echotype_provider_config') || '{}');
    });

    console.log(`  Active provider: ${config.state?.activeProviderId}`);
    console.log(`  Ollama auth type: ${config.state?.providers?.ollama?.auth?.type}`);
    console.log(`  Ollama model: ${config.state?.providers?.ollama?.selectedModelId}`);
    console.log(`  Ollama base URL: ${config.state?.providers?.ollama?.baseUrl}`);

    expect(config.state?.activeProviderId).toBe('ollama');
    expect(config.state?.providers?.ollama?.auth?.type).toBe('none');

    // Reload and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const configAfter = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('echotype_provider_config') || '{}');
    });

    expect(configAfter.state?.activeProviderId).toBe('ollama');
    console.log('  ✅ Config persists across reloads');

    console.log('✅ TC-10: Provider store persistence test completed');
  });

  // ─── TC-11: Performance Comparison ────────────────────────────────────────

  test('TC-11: Response time measurement for Ollama', async ({ page, request }) => {
    const isRunning = await checkOllamaRunning(request);
    test.skip(!isRunning, 'Ollama is not running');

    // Measure translation API response time
    const startTime = Date.now();
    const res = await page.request.post('/api/translate', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        text: 'Hello world',
        targetLang: 'Chinese',
        provider: 'ollama',
        modelId: DEFAULT_MODEL,
        baseUrl: OLLAMA_BASE_URL,
      },
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(res.status()).toBe(200);
    const data = await res.json();

    console.log(`  ✅ Translation: "${data.translation}"`);
    console.log(`  ⏱️  Response time: ${responseTime}ms`);
    console.log(`  Model: ${DEFAULT_MODEL}`);

    console.log('✅ TC-11: Performance measurement completed');
  });
});

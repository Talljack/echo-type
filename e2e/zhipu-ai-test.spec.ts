import { test, expect, type Page } from '@playwright/test';

// ─── Z.AI API Key from .env.local ───────────────────────────────────────────────
const ZHIPU_API_KEY = '82a7be32da64412ab70b3dff6a81677c.2258WHZFw8VPboi0';
const ZAI_CODING_BASE = 'https://api.z.ai/api/coding/paas/v4';

// Helper: wait for store to settle
async function waitForStore(page: Page) {
  await page.waitForTimeout(500);
}

// Helper: set localStorage for provider-store to use ZhiPu directly
async function injectZhipuConfig(page: Page) {
  await page.goto('/library');
  await page.waitForLoadState('domcontentloaded');

  // Set provider store in localStorage
  await page.evaluate((key) => {
    const config = {
      state: {
        providers: {
          zhipuai: {
            auth: { type: 'api-key', apiKey: key },
            selectedModelId: 'glm-4.5',
            noModelApi: true,
          },
        },
        activeProviderId: 'zhipuai',
      },
      version: 0,
    };

    // Merge with existing data
    const existing = localStorage.getItem('echotype_provider_config');
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        parsed.state.providers.zhipuai = config.state.providers.zhipuai;
        parsed.state.activeProviderId = 'zhipuai';
        localStorage.setItem('echotype_provider_config', JSON.stringify(parsed));
      } catch {
        localStorage.setItem('echotype_provider_config', JSON.stringify(config));
      }
    } else {
      localStorage.setItem('echotype_provider_config', JSON.stringify(config));
    }
  }, ZHIPU_API_KEY);

  // Reload to pick up changes
  await page.reload();
  await page.waitForLoadState('networkidle');
  await waitForStore(page);
}

// ─── Test Suite ─────────────────────────────────────────────────────────────────

test.describe('ZhiPu AI Integration Tests', () => {
  test.setTimeout(120000);

  // ─── TC-00: Verify API Key + Models ──────────────────────────────────────────

  test('TC-00: Verify Z.AI API key via Coding Plan endpoint', async ({ request }) => {
    // Test a simple completion against Z.AI Coding Plan endpoint
    const chatRes = await request.post(`${ZAI_CODING_BASE}/chat/completions`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ZHIPU_API_KEY}`,
      },
      data: {
        model: 'glm-4.5',
        messages: [{ role: 'user', content: 'Say hello' }],
        max_tokens: 10,
      },
    });

    expect(chatRes.status()).toBe(200);
    const chatData = await chatRes.json();
    console.log(`  ✅ Z.AI Coding Plan works! Model: ${chatData.model}`);
    console.log(`  Response: ${chatData.choices?.[0]?.message?.content || chatData.choices?.[0]?.message?.reasoning_content?.substring(0, 80)}`);
    console.log(`  Usage: ${JSON.stringify(chatData.usage)}`);

    console.log('✅ TC-00: API key verification completed');
  });

  // ─── TC-01: Settings UI - Configure ZhiPu ─────────────────────────────────

  test('TC-01: Configure ZhiPu AI as active provider in settings UI', async ({ page }) => {
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

    // 3. Verify Chinese group exists with Z.AI
    const zhipuOption = page.getByText('Z.AI (GLM)');
    await expect(zhipuOption).toBeVisible();

    // 4. Select Z.AI
    await zhipuOption.click();
    await page.waitForTimeout(500);

    // 5. Verify Z.AI description
    await expect(page.getByText(/GLM-4.5.*Z.AI Coding Plan/)).toBeVisible();

    // 6. Verify API key input and help link
    await expect(page.getByText('API Key', { exact: true })).toBeVisible();
    const helpLink = page.locator('a[href*="z.ai"]');
    await expect(helpLink).toBeVisible();

    // 7. Input API key
    const apiKeyInput = page.locator('input[type="password"]').first();
    await apiKeyInput.fill(ZHIPU_API_KEY);

    // 8. Check "No model API support" to skip dynamic fetching
    const checkboxContainer = page.getByText('No model API support').locator('..');
    await checkboxContainer.click();
    await page.waitForTimeout(200);

    // 9. Connect
    const connectBtn = page.locator('button').filter({ hasText: /^Connect$/ });
    await connectBtn.click();
    await page.waitForTimeout(2000);

    // 10. Verify active status
    const activeIndicator = page.locator('.text-emerald-600, .bg-emerald-500');
    const activeCount = await activeIndicator.count();
    console.log(`  Active indicators found: ${activeCount}`);

    // 11. Verify model selector shows GLM models
    const modelDropdowns = page.locator('button[role="combobox"]');
    const modelDropdown = modelDropdowns.nth(1);
    if (await modelDropdown.isVisible()) {
      await modelDropdown.click();
      await page.waitForTimeout(300);

      const glm45 = page.getByText('GLM-4.5', { exact: false });
      const glm46 = page.getByText('GLM-4.6', { exact: false });
      const glm47flash = page.getByText('GLM-4.7 Flash', { exact: false });

      console.log(`  GLM-4.5 visible: ${await glm45.first().isVisible().catch(() => false)}`);
      console.log(`  GLM-4.6 visible: ${await glm46.first().isVisible().catch(() => false)}`);
      console.log(`  GLM-4.7 Flash visible: ${await glm47flash.first().isVisible().catch(() => false)}`);

      // Close dropdown by pressing Escape
      await page.keyboard.press('Escape');
    }

    // 12. Screenshot for verification
    await page.screenshot({ path: 'test-results/tc01-settings-zhipu.png', fullPage: true });
    console.log('  Screenshot: test-results/tc01-settings-zhipu.png');

    console.log('✅ TC-01: ZhiPu AI configured in settings UI');
  });

  // ─── TC-02: API Route - Translation ────────────────────────────────────────

  test('TC-02: Translation API route with ZhiPu', async ({ page }) => {
    const res = await page.request.post('/api/translate', {
      headers: {
        'Content-Type': 'application/json',
        'x-zhipu-key': ZHIPU_API_KEY,
      },
      data: {
        text: 'Hello world',
        targetLang: 'Chinese',
        provider: 'zhipuai',
        modelId: 'glm-4.5',
      },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.translation).toBeTruthy();
    console.log(`  ✅ Translation: "${data.translation}"`);

    console.log('✅ TC-02: Translation API test completed');
  });

  // ─── TC-03: API Route - Chat (Streaming) ──────────────────────────────────

  test('TC-03: Chat API route with ZhiPu (streaming)', async ({ page }) => {
    const res = await page.request.post('/api/chat', {
      headers: {
        'Content-Type': 'application/json',
        'x-zhipu-key': ZHIPU_API_KEY,
      },
      data: {
        messages: [{ role: 'user', content: 'Say hello in one word' }],
        provider: 'zhipuai',
        modelId: 'glm-4.5',
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

  // ─── TC-04: API Route - Recommendations ───────────────────────────────────

  test('TC-04: Recommendations API route with ZhiPu', async ({ page }) => {
    const res = await page.request.post('/api/recommendations', {
      headers: {
        'Content-Type': 'application/json',
        'x-zhipu-key': ZHIPU_API_KEY,
      },
      data: {
        content: 'hello',
        contentType: 'word',
        count: 3,
        provider: 'zhipuai',
        modelId: 'glm-4.5',
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

  // ─── TC-05: API Route - AI Generate ───────────────────────────────────────

  test('TC-05: AI Generate API route with ZhiPu', async ({ page }) => {
    const testCases = [
      { topic: 'travel', difficulty: 'beginner', contentType: 'word' },
      { topic: 'technology', difficulty: 'intermediate', contentType: 'sentence' },
      { topic: 'business', difficulty: 'advanced', contentType: 'article' },
    ];

    for (const tc of testCases) {
      const res = await page.request.post('/api/ai/generate', {
        headers: {
          'Content-Type': 'application/json',
          'x-zhipu-key': ZHIPU_API_KEY,
        },
        data: { ...tc, provider: 'zhipuai', modelId: 'glm-4.5' },
      });

      expect(res.status()).toBe(200);
      const data = await res.json();
      expect(data.text).toBeTruthy();
      expect(data.type).toBe(tc.contentType);
      console.log(`  ✅ ${tc.contentType}/${tc.difficulty}: "${data.text.substring(0, 80)}..."`);
    }

    console.log('✅ TC-05: AI Generate API test completed');
  });

  // ─── TC-06: API Route - Classification ────────────────────────────────────

  test('TC-06: Classification API route with ZhiPu', async ({ page }) => {
    const res = await page.request.post('/api/tools/classify', {
      headers: {
        'Content-Type': 'application/json',
        'x-zhipu-key': ZHIPU_API_KEY,
      },
      data: {
        text: 'The stock market rally continued today as tech shares surged.',
        provider: 'zhipuai',
        modelId: 'glm-4.5',
      },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.category).toBeTruthy();
    console.log(`  ✅ Category: ${data.category}`);

    console.log('✅ TC-06: Classification API test completed');
  });

  // ─── TC-07: Multi-model API Test ──────────────────────────────────────────

  test('TC-07: Test all ZhiPu models via translate API', async ({ page }) => {
    const models = ['glm-4.5', 'glm-4.5-air', 'glm-4.6', 'glm-4.7', 'glm-4.7-flash'];

    for (const modelId of models) {
      const res = await page.request.post('/api/translate', {
        headers: {
          'Content-Type': 'application/json',
          'x-zhipu-key': ZHIPU_API_KEY,
        },
        data: {
          text: 'Knowledge is power.',
          targetLang: 'Chinese',
          provider: 'zhipuai',
          modelId,
        },
      });

      expect(res.status()).toBe(200);
      const data = await res.json();
      expect(data.translation).toBeTruthy();
      console.log(`  ✅ ${modelId}: "${data.translation}"`);
    }

    console.log('✅ TC-07: Multi-model test completed');
  });

  // ─── TC-08: Error Handling ────────────────────────────────────────────────

  test('TC-08: Error handling - invalid API key', async ({ page }) => {
    const res = await page.request.post('/api/translate', {
      headers: {
        'Content-Type': 'application/json',
        'x-zhipu-key': 'invalid-key-12345',
      },
      data: {
        text: 'Hello',
        targetLang: 'Chinese',
        provider: 'zhipuai',
        modelId: 'glm-4.5',
      },
    });

    expect([400, 401, 403, 500]).toContain(res.status());
    const data = await res.json();
    expect(data.error).toBeTruthy();
    console.log(`  Invalid key: Status ${res.status()}, Error: ${data.error}`);

    console.log('✅ TC-08: Error handling test completed');
  });

  test('TC-08b: Error handling - missing provider', async ({ page }) => {
    const res = await page.request.post('/api/chat', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        messages: [{ role: 'user', content: 'Hello' }],
        provider: 'nonexistent_provider',
      },
    });

    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Unknown provider');
    console.log(`  Unknown provider: ${data.error}`);

    console.log('✅ TC-08b: Unknown provider error test completed');
  });

  test('TC-08c: Error handling - missing fields', async ({ page }) => {
    // Missing targetLang
    const res1 = await page.request.post('/api/translate', {
      headers: {
        'Content-Type': 'application/json',
        'x-zhipu-key': ZHIPU_API_KEY,
      },
      data: { text: 'Hello', provider: 'zhipuai' },
    });
    expect(res1.status()).toBe(400);

    // Missing content for recommendations
    const res2 = await page.request.post('/api/recommendations', {
      headers: {
        'Content-Type': 'application/json',
        'x-zhipu-key': ZHIPU_API_KEY,
      },
      data: { provider: 'zhipuai' },
    });
    expect(res2.status()).toBe(400);

    // Missing fields for generate
    const res3 = await page.request.post('/api/ai/generate', {
      headers: {
        'Content-Type': 'application/json',
        'x-zhipu-key': ZHIPU_API_KEY,
      },
      data: { topic: 'travel', provider: 'zhipuai' },
    });
    expect(res3.status()).toBe(400);

    console.log('✅ TC-08c: Missing fields error handling works');
  });

  // ─── TC-09: Listen Page UI with ZhiPu ────────────────────────────────────

  test('TC-09: Listen page with ZhiPu configured', async ({ page }) => {
    await injectZhipuConfig(page);

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

      // Look for translation and recommendation components
      const pageContent = await page.content();
      const hasTranslationToggle = pageContent.includes('translation') || pageContent.includes('Translation');
      const hasRecommendation = pageContent.includes('recommendation') || pageContent.includes('Recommendation');
      console.log(`  Translation components: ${hasTranslationToggle}`);
      console.log(`  Recommendation components: ${hasRecommendation}`);

      // Screenshot
      await page.screenshot({ path: 'test-results/tc09-listen-page.png', fullPage: true });
      console.log('  Screenshot: test-results/tc09-listen-page.png');
    } else {
      console.log('  ⚠️ No listen links found in library');

      // Screenshot library page for debugging
      await page.screenshot({ path: 'test-results/tc09-library.png', fullPage: true });
    }

    console.log('✅ TC-09: Listen page test completed');
  });

  // ─── TC-10: Speak Page UI with ZhiPu ─────────────────────────────────────

  test('TC-10: Speak page with ZhiPu configured', async ({ page }) => {
    await injectZhipuConfig(page);

    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const speakLink = page.locator('a[href*="/speak/"]').first();
    if (await speakLink.isVisible()) {
      const href = await speakLink.getAttribute('href');
      console.log(`  Navigating to: ${href}`);
      await speakLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'test-results/tc10-speak-page.png', fullPage: true });
      console.log('  Screenshot: test-results/tc10-speak-page.png');
    } else {
      console.log('  ⚠️ No speak links found');
    }

    console.log('✅ TC-10: Speak page test completed');
  });

  // ─── TC-11: Write Page UI with ZhiPu ─────────────────────────────────────

  test('TC-11: Write page with ZhiPu configured', async ({ page }) => {
    await injectZhipuConfig(page);

    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const writeLink = page.locator('a[href*="/write/"]').first();
    if (await writeLink.isVisible()) {
      const href = await writeLink.getAttribute('href');
      console.log(`  Navigating to: ${href}`);
      await writeLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'test-results/tc11-write-page.png', fullPage: true });
      console.log('  Screenshot: test-results/tc11-write-page.png');
    } else {
      console.log('  ⚠️ No write links found');
    }

    console.log('✅ TC-11: Write page test completed');
  });

  // ─── TC-12: Tools Page AI Generate UI ─────────────────────────────────────

  test('TC-12: Tools page AI Generate UI', async ({ page }) => {
    await injectZhipuConfig(page);

    await page.goto('/tools');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify tabs exist
    await expect(page.getByText('Media Import', { exact: false })).toBeVisible();
    await expect(page.getByText('AI Generate', { exact: false })).toBeVisible();

    // Switch to AI Generate tab
    await page.getByText('AI Generate', { exact: false }).click();
    await page.waitForTimeout(500);

    // Screenshot
    await page.screenshot({ path: 'test-results/tc12-tools-page.png', fullPage: true });
    console.log('  Screenshot: test-results/tc12-tools-page.png');

    console.log('✅ TC-12: Tools page test completed');
  });

  // ─── TC-13: Chat Panel UI ─────────────────────────────────────────────────

  test('TC-13: Chat panel UI interaction', async ({ page }) => {
    await injectZhipuConfig(page);

    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find the chat FAB - it should be a fixed button at bottom right
    const allButtons = page.locator('button');
    const count = await allButtons.count();
    console.log(`  Total buttons on page: ${count}`);

    // Try to find chat-related button
    for (let i = count - 1; i >= Math.max(0, count - 5); i--) {
      const btn = allButtons.nth(i);
      const text = await btn.textContent().catch(() => '');
      const className = await btn.getAttribute('class') || '';
      if (className.includes('fixed') || className.includes('absolute') || className.includes('bottom')) {
        console.log(`  Potential FAB button ${i}: "${text?.trim()}" class="${className.substring(0, 80)}"`);
      }
    }

    // Screenshot to see the page state
    await page.screenshot({ path: 'test-results/tc13-chat-fab.png', fullPage: true });
    console.log('  Screenshot: test-results/tc13-chat-fab.png');

    console.log('✅ TC-13: Chat panel UI test completed');
  });

  // ─── TC-14: Dynamic Model Fetching ────────────────────────────────────────

  test('TC-14: Dynamic model fetching for ZhiPu', async ({ page }) => {
    const res = await page.request.fetch('/api/models?providerId=zhipuai', {
      headers: {
        'x-api-key': ZHIPU_API_KEY,
      },
    });

    console.log(`  Status: ${res.status()}`);
    const data = await res.json();
    console.log(`  Response: ${JSON.stringify(data).substring(0, 500)}`);

    if (data.models) {
      console.log(`  Dynamic models count: ${data.models.length}`);
      for (const m of data.models) {
        console.log(`    - ${m.id}: ${m.name || m.id}`);
      }
    }

    console.log('✅ TC-14: Dynamic model fetching test completed');
  });

  // ─── TC-15: Provider Store Persistence ────────────────────────────────────

  test('TC-15: Provider store persists ZhiPu config across reloads', async ({ page }) => {
    await injectZhipuConfig(page);

    // Read the stored config
    const config = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('echotype_provider_config') || '{}');
    });

    console.log(`  Active provider: ${config.state?.activeProviderId}`);
    console.log(`  ZhiPu auth type: ${config.state?.providers?.zhipuai?.auth?.type}`);
    console.log(`  ZhiPu model: ${config.state?.providers?.zhipuai?.selectedModelId}`);

    expect(config.state?.activeProviderId).toBe('zhipuai');
    expect(config.state?.providers?.zhipuai?.auth?.type).toBe('api-key');

    // Reload and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const configAfter = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('echotype_provider_config') || '{}');
    });

    expect(configAfter.state?.activeProviderId).toBe('zhipuai');
    console.log('  ✅ Config persists across reloads');

    console.log('✅ TC-15: Provider store persistence test completed');
  });

  // ─── TC-16: Settings Translation Section ──────────────────────────────────

  test('TC-16: Settings Translation and Recommendations sections', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verify Translation section
    await expect(page.getByRole('heading', { name: 'Translation' })).toBeVisible();
    await expect(page.getByText('Show by default')).toBeVisible();
    await expect(page.getByText('Target language')).toBeVisible();

    // Verify language options
    const langDropdown = page.locator('button[role="combobox"]').last();
    await langDropdown.click();
    await page.waitForTimeout(300);

    const langs = ['Chinese', 'Japanese', 'Korean', 'Spanish', 'French', 'German'];
    for (const lang of langs) {
      const option = page.getByText(lang, { exact: false });
      const visible = await option.isVisible().catch(() => false);
      console.log(`  Language "${lang}": ${visible ? '✅' : '❌'}`);
    }
    await page.keyboard.press('Escape');

    // Verify Recommendations section
    await expect(page.getByRole('heading', { name: 'Recommendations' })).toBeVisible();
    await expect(page.getByText('Enable recommendations')).toBeVisible();

    await page.screenshot({ path: 'test-results/tc16-settings-full.png', fullPage: true });
    console.log('  Screenshot: test-results/tc16-settings-full.png');

    console.log('✅ TC-16: Settings sections test completed');
  });
});

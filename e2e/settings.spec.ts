import { test, expect, type Page } from '@playwright/test';

const PROVIDER_STORAGE_KEY = 'echotype_provider_config';

type SeededProviderState = {
  activeProviderId: string;
  providers: Record<
    string,
    {
      providerId: string;
      auth: { type: 'none' | 'api-key'; apiKey?: string };
      selectedModelId: string;
      noModelApi?: boolean;
    }
  >;
};

async function seedProviderState(page: Page, state: SeededProviderState) {
  await page.addInitScript(
    ({ storageKey, providerState }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(providerState));
    },
    { storageKey: PROVIDER_STORAGE_KEY, providerState: state },
  );
}

test.describe('Settings Page', () => {
  test('settings page loads with AI config section', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Settings');
    await expect(page.getByRole('heading', { name: 'AI Provider' })).toBeVisible();
    await expect(page.getByText('Provider', { exact: true })).toBeVisible();
    await expect(page.getByText('API Key', { exact: true })).toBeVisible();
  });

  test('settings page has speech settings section', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Voice & Speech' })).toBeVisible();
    await expect(page.getByText('Speed', { exact: true }).first()).toBeVisible();
  });

  test('API key inputs are password type', async ({ page }) => {
    await page.goto('/settings');
    const passwordInputs = page.locator('input[type="password"]');
    const count = await passwordInputs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('can switch between providers and only active provider disconnects', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await seedProviderState(page, {
      activeProviderId: 'openai',
      providers: {
        openai: {
          providerId: 'openai',
          auth: { type: 'api-key', apiKey: 'sk-openai-test' },
          selectedModelId: 'gpt-4o',
          noModelApi: true,
        },
        anthropic: {
          providerId: 'anthropic',
          auth: { type: 'api-key', apiKey: 'sk-ant-test' },
          selectedModelId: 'claude-sonnet-4-5-20251001',
          noModelApi: true,
        },
      },
    });

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'AI Provider' })).toBeVisible();

    const providerCombobox = page.getByRole('combobox').first();
    await expect(providerCombobox).toBeVisible();
    await expect(providerCombobox).toContainText('OpenAI');

    await providerCombobox.click();
    await page.getByRole('option', { name: /Anthropic/i }).click();
    await expect(providerCombobox).toContainText('Anthropic');

    await providerCombobox.click();
    await expect(page.getByRole('option', { name: /OpenAI/i })).not.toContainText('Connected');
    await expect(page.getByRole('option', { name: /Anthropic/i })).toContainText('Connected');

    await page.getByRole('option', { name: /Google/i }).click();
    await expect(providerCombobox).toContainText('Google');

    await providerCombobox.click();
    await expect(page.getByRole('option', { name: /Anthropic/i })).toContainText('Connected');
    await expect(page.getByRole('option', { name: /OpenAI/i })).not.toContainText('Connected');

    expect(errors).toHaveLength(0);
  });

  test('switching to same provider does not disconnect it', async ({ page }) => {
    await seedProviderState(page, {
      activeProviderId: 'groq',
      providers: {
        groq: {
          providerId: 'groq',
          auth: { type: 'api-key', apiKey: 'gsk_test_123' },
          selectedModelId: 'llama-3.3-70b-versatile',
          noModelApi: true,
        },
      },
    });

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'AI Provider' })).toBeVisible();

    const providerCombobox = page.getByRole('combobox').first();
    await expect(providerCombobox).toContainText('Groq');
    await expect(page.getByText('Connected', { exact: true }).first()).toBeVisible();

    await providerCombobox.click();
    await page.getByRole('option', { name: /Groq/i }).click();

    await expect(providerCombobox).toContainText('Groq');
    await expect(page.getByText('Connected', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Default', { exact: true }).first()).toBeVisible();
  });
});

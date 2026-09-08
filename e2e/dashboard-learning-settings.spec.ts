import { expect, test } from '@playwright/test';

test('one daily plan with usable, persistent learning settings at narrow and zoomed widths', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByTestId('today-workspace')).toBeVisible({timeout:30000});
  await expect(page.getByText('Custom daily plan: goals, tasks and scheduling',{exact:true})).toHaveCount(0);
  const settings=page.getByTestId('learning-settings');
  await settings.locator('summary').click();
  await expect(settings.getByRole('heading',{name:'Learning focus'})).toBeVisible();
  await settings.getByRole('button',{name:'Speaking',exact:true}).click();
  await settings.getByRole('button',{name:'6 practices',exact:true}).click();
  await page.reload();
  await page.getByTestId('learning-settings').locator('summary').click();
  await expect(settings.getByRole('button',{name:'Speaking',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(settings.getByRole('button',{name:'6 practices',exact:true})).toHaveAttribute('aria-pressed','true');
  for(const width of [1440,1024,768,375]) {
    await page.setViewportSize({width,height:1000});
    await expect(page.getByRole('button',{name:'Close menu'})).not.toBeInViewport();
    await page.evaluate(()=>document.documentElement.style.fontSize='20px');
    const description=settings.getByTestId('learning-focus-description');
    expect((await description.boundingBox())!.width).toBeGreaterThan(width===375?210:300);
    expect(await settings.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    expect(await page.locator('main').last().evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  }
  await page.evaluate(()=>document.documentElement.style.fontSize='');
  await page.setViewportSize({width:1440,height:1100});
  await page.reload();
  await page.getByTestId('learning-settings').locator('summary').click();
  await expect(page.getByRole('link',{name:'Dashboard',exact:true})).toBeInViewport();
  await page.evaluate(()=>document.querySelectorAll('*').forEach(el=>{if(el.scrollTop)el.scrollTop=0;}));
  await page.screenshot({path:'docs/design/today-settings-desktop.png'});
  await page.setViewportSize({width:375,height:1000});
  await expect(page.getByRole('button',{name:'Close menu'})).not.toBeInViewport();
  await settings.scrollIntoViewIfNeeded();
  await page.screenshot({path:'docs/design/today-settings-mobile.png'});
});

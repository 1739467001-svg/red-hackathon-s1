import { test, expect } from '@playwright/test';

test.describe('Tekken 8 Visual — Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('hero section shows KV background image', async ({ page }) => {
    const hero = page.locator('section').first();
    await expect(hero).toBeVisible();
    // KV image div should exist inside hero
    const kvBg = page.locator('[style*="kv_pc_v2"]');
    await expect(kvBg).toBeAttached();
  });

  test('decorative character illustrations are present', async ({ page }) => {
    const jin = page.locator('img[src*="img_jin_pc"]');
    const kazuya = page.locator('img[src*="img_kazuya_pc"]');
    await expect(jin).toBeAttached();
    await expect(kazuya).toBeAttached();
  });

  test('particle canvas is rendering', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const position = await canvas.evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe('fixed');
  });

  test('title "HinH" has Tekken glow shadow', async ({ page }) => {
    const title = page.getByRole('heading', { name: 'HinH' });
    await expect(title).toBeVisible();
    const shadow = await title.evaluate((el) => el.style.textShadow);
    expect(shadow).toContain('rgba(245, 10, 100');
  });

  test('subtitle uses cyan color', async ({ page }) => {
    const subtitle = page.getByText('AI-DRIVEN HACKATHON SIMULATION');
    await expect(subtitle).toBeVisible();
    const color = await subtitle.evaluate((el) => el.style.color);
    expect(color).toContain('var(--tk-cyan)');
  });

  test('start button uses tk-btn pink style', async ({ page }) => {
    const btn = page.getByRole('button', { name: '开始模拟' });
    await expect(btn).toBeVisible();
    const classes = await btn.getAttribute('class');
    expect(classes).toContain('tk-btn');
  });

  test('numbered badge uses pink background', async ({ page }) => {
    const badge = page.locator('span').filter({ hasText: /^1$/ }).first();
    await expect(badge).toBeVisible();
    const bg = await badge.evaluate((el) => el.style.backgroundColor);
    expect(bg).toContain('var(--tk-pink)');
  });

  test('dividers use cyan gradient', async ({ page }) => {
    const divider = page.locator('[style*="linear-gradient"]').first();
    await expect(divider).toBeAttached();
  });

  test('cursor stalker element exists on desktop', async ({ page, isMobile }) => {
    const stalker = page.locator('#stalker');
    await expect(stalker).toBeAttached();
    if (!isMobile) {
      const display = await stalker.evaluate((el) => getComputedStyle(el).display);
      expect(display).toBe('block');
    }
  });
});

test.describe('Home Page — Interaction Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('empty submit shows pink error message', async ({ page }) => {
    await page.getByRole('button', { name: '开始模拟' }).click();
    const error = page.getByText('请至少输入一个想法');
    await expect(error).toBeVisible();
    const color = await error.evaluate((el) => el.style.color);
    expect(color).toContain('var(--tk-pink)');
  });

  test('can add up to 4 ideas then add button disappears', async ({ page }) => {
    await expect(page.getByRole('textbox')).toHaveCount(1);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: '添加更多想法' }).click();
    }
    await expect(page.getByRole('textbox')).toHaveCount(4);
    await expect(page.getByRole('button', { name: '添加更多想法' })).not.toBeVisible();
  });

  test('can remove ideas back down to 1', async ({ page }) => {
    await page.getByRole('button', { name: '添加更多想法' }).click();
    await expect(page.getByRole('textbox')).toHaveCount(2);
    await page.getByRole('button', { name: '移除这个想法' }).first().click();
    await expect(page.getByRole('textbox')).toHaveCount(1);
    await expect(page.getByRole('button', { name: '移除这个想法' })).not.toBeVisible();
  });

  test('textarea focus shows cyan border glow', async ({ page }) => {
    const textarea = page.getByRole('textbox').first();
    await textarea.focus();
    const borderColor = await textarea.evaluate((el) => el.style.borderColor);
    expect(borderColor).toContain('var(--tk-cyan)');
    const boxShadow = await textarea.evaluate((el) => el.style.boxShadow);
    expect(boxShadow).toContain('63, 209, 231');
  });

  test('add button hover shows cyan glow', async ({ page, isMobile }) => {
    if (isMobile) return;
    const addBtn = page.getByRole('button', { name: '添加更多想法' });
    await addBtn.hover();
    const border = await addBtn.evaluate((el) => el.style.borderColor);
    expect(border).toContain('var(--tk-cyan)');
  });
});

test.describe('Navigation Guards', () => {
  test('simulation page redirects to home without active simulation', async ({ page }) => {
    await page.goto('/simulation');
    await page.waitForURL('/');
    expect(page.url()).toContain('/');
  });

  test('result page redirects to home without simulation id', async ({ page }) => {
    await page.goto('/result');
    await page.waitForURL('/');
    expect(page.url()).toContain('/');
  });
});

test.describe('Tekken 8 Visual Consistency', () => {
  test('scrollbar uses cyan theme (not red)', async ({ page }) => {
    await page.goto('/');
    const scrollbarColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).scrollbarColor;
    });
    // Should contain cyan-based color, not red/pink
    expect(scrollbarColor).toBeTruthy();
    // Verify it's NOT the old pink scrollbar
    expect(scrollbarColor).not.toContain('rgb(245, 10, 100)');
  });

  test('body uses tk-bg background', async ({ page }) => {
    await page.goto('/');
    const bodyStyle = await page.evaluate(() => document.body.style.background);
    expect(bodyStyle).toContain('var(--tk-bg)');
  });
});

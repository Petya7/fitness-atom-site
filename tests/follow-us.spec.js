import { test, expect } from '@playwright/test'

const links = {
  Facebook: 'https://www.facebook.com/FitnessAtom',
  Instagram: 'https://www.instagram.com/atom_my_fitness/',
}

test.describe('"Последвай ни" on the home page', () => {
  test('sits between the workout cards and the dark "Първата тренировка" box', async ({ page }) => {
    await page.goto('/')
    const follow = page.getByRole('region', { name: 'Последвай ни' })
    await expect(follow).toBeVisible()

    const cardsBox = await page.locator('.workout-grid').boundingBox()
    const followBox = await follow.boundingBox()
    const ctaBox = await page.locator('.home-cta').boundingBox()
    expect(followBox.y).toBeGreaterThan(cardsBox.y + cardsBox.height - 1)
    expect(ctaBox.y).toBeGreaterThan(followBox.y + followBox.height - 1)
  })

  test('shows only the label and the two logos, without the old heading and text', async ({ page }) => {
    await page.goto('/')
    const follow = page.getByRole('region', { name: 'Последвай ни' })
    await expect(follow.getByText(/^последвай ни$/i)).toBeVisible()
    await expect(follow.getByText('Виж ни в действие')).toHaveCount(0)
    await expect(follow.getByText(/Видеа от тренировките/)).toHaveCount(0)
    await expect(follow.getByRole('link')).toHaveCount(2)
  })

  for (const [name, href] of Object.entries(links)) {
    test(`${name} logo opens the gym's ${name} page in a new tab`, async ({ page }) => {
      await page.goto('/')
      const link = page.getByRole('region', { name: 'Последвай ни' }).getByRole('link', { name: `ATOM My Fitness в ${name}` })
      await expect(link).toHaveAttribute('href', href)
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', /noreferrer/)

      // The original round logo is shown, loaded and big enough to tap easily.
      // (The logos load lazily, when the visitor scrolls near them, so scroll there first.)
      const logo = link.locator('img')
      await expect(logo).toHaveAttribute('src', `/assets/social/${name.toLowerCase()}.png`)
      await logo.scrollIntoViewIfNeeded()
      await expect.poll(() => logo.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true)
      const box = await logo.boundingBox()
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(Math.abs(box.width - box.height)).toBeLessThan(1)
    })
  }

  test('the two logos sit side by side and the page has no sideways scrolling', async ({ page }) => {
    await page.goto('/')
    const logos = page.getByRole('region', { name: 'Последвай ни' }).locator('img')
    const [first, second] = [await logos.nth(0).boundingBox(), await logos.nth(1).boundingBox()]
    expect(Math.abs(first.y - second.y)).toBeLessThan(2)
    expect(second.x).toBeGreaterThan(first.x + first.width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })

  test('the temporary design switch is gone: other placements never appear', async ({ page }) => {
    for (const option of ['b', 'c', 'd']) {
      await page.goto(`/?follow=${option}#/home`)
      await expect(page.getByRole('region', { name: 'Последвай ни' })).toHaveCount(1)
      await expect(page.locator('.hero, .home-cta').locator('a[href*="instagram.com"]')).toHaveCount(0)
      await page.goto(`/?follow=${option}#/schedule`)
      await expect(page.locator('main a[href*="instagram.com"]')).toHaveCount(0)
    }
  })
})

test.describe('Footer', () => {
  for (const [name, href] of Object.entries(links)) {
    test(`links to ${name}`, async ({ page }) => {
      await page.goto('/')
      const link = page.locator('footer').getByRole('link', { name: `ATOM My Fitness в ${name}` })
      await expect(link).toHaveAttribute('href', href)
      await expect(link).toHaveAttribute('target', '_blank')
    })
  }
})

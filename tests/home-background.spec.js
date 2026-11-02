import { test, expect } from '@playwright/test'

const background = (page) => page.locator('.hero-bg')
const photos = (page) => page.locator('.hero-bg .hero-bg-photo')

// Jump the background's CSS animations to a moment in time (milliseconds) so the test
// doesn't have to wait for the slow real-time movement.
const jumpBackgroundTo = (page, ms) => page.evaluate((time) => {
  document.getAnimations()
    .filter((animation) => animation.effect?.target?.closest?.('.hero-bg'))
    .forEach((animation) => { animation.pause(); animation.currentTime = time })
}, ms)

const visiblePhoto = (page) => photos(page).evaluateAll((els) => {
  const opacities = els.map((el) => Number(getComputedStyle(el).opacity))
  const max = Math.max(...opacities)
  return { index: opacities.indexOf(max), opacity: max }
})

test.describe('Home page moving background', () => {
  test('fills the dark top section with four gym photos, lightly blurred', async ({ page }) => {
    const failed = []
    page.on('response', (r) => { if (r.status() >= 400) failed.push(r.url()) })
    await page.goto('/')

    await expect(background(page)).toHaveAttribute('aria-hidden', 'true') // decorative only
    await expect(photos(page)).toHaveCount(4)
    const images = await photos(page).evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundImage))
    expect(images.join(' ')).toMatch(/home-group-fitness\.jpg.*tabata\.jpg.*folk-dance\.jpg.*yoga\.jpg/)
    for (const filter of await photos(page).evaluateAll((els) => els.map((el) => getComputedStyle(el).filter))) {
      expect(filter).toContain('blur(4px)')
    }

    // The background covers the whole dark area.
    const bandBox = await page.locator('.hero-band').boundingBox()
    const bgBox = await background(page).boundingBox()
    expect(bgBox.width).toBeGreaterThanOrEqual(bandBox.width - 1)
    expect(bgBox.height).toBeGreaterThanOrEqual(bandBox.height - 1)
    expect(bandBox.width).toBeGreaterThanOrEqual(page.viewportSize().width - 1)

    await page.waitForLoadState('networkidle')
    expect(failed).toEqual([])
  })

  test('slowly changes from one photo to the next', async ({ page }) => {
    await page.goto('/')
    const seen = []
    for (const ms of [3000, 9000, 15000, 21000]) {
      await jumpBackgroundTo(page, ms)
      const { index, opacity } = await visiblePhoto(page)
      expect(opacity, `a photo is fully shown at ${ms / 1000}s`).toBeGreaterThan(0.95)
      seen.push(index)
    }
    expect(seen).toEqual([0, 1, 2, 3])

    // Each photo slowly zooms while it is shown.
    await jumpBackgroundTo(page, 1000)
    const early = await photos(page).first().evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)
    await jumpBackgroundTo(page, 5000)
    const later = await photos(page).first().evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)
    expect(later).toBeGreaterThan(early)
  })

  test('text and buttons stay on top of the background and keep working', async ({ page }) => {
    await page.goto('/')
    for (const locator of [page.locator('.hero h1'), page.getByRole('button', { name: 'Виж тренировките' })]) {
      const box = await locator.boundingBox()
      const onTop = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('.hero-copy') !== null, [box.x + box.width / 2, box.y + box.height / 2])
      expect(onTop).toBe(true)
    }
    await page.getByRole('button', { name: 'Виж тренировките' }).click()
    await expect(page.locator('main h1')).toHaveText('Групови тренировки')
  })

  test('no sideways scrolling', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })

  test('visitors who turned off animations get a still photo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('.hero-bg')).length)
    expect(running).toBe(0)
    await expect(photos(page).first()).toHaveCSS('opacity', '1')
  })

  test('only appears on the home page', async ({ page }) => {
    await page.goto('/#/schedule')
    await expect(page.locator('main h1')).toHaveText('Седмична програма')
    await expect(background(page)).toHaveCount(0)
  })
})

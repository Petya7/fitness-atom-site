import { test, expect } from '@playwright/test'

const REEL_URL = 'https://www.instagram.com/p/DfWjGYkR-fu/'
const EMBED_URL = 'https://www.instagram.com/p/DfWjGYkR-fu/embed/'

// Instagram is not reachable from the test machine, so answer its requests with a stand-in page.
test.beforeEach(async ({ page }) => {
  await page.route('https://www.instagram.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<p>instagram stand-in</p>' }))
})

const reelSection = (page) => page.getByRole('region', { name: 'Вижте ни в действие' })

test.describe('Instagram reel on the Табата page', () => {
  test('shows the "Вижте ни в действие" title above the reel', async ({ page }) => {
    await page.goto('/#/tabata')
    const section = reelSection(page)
    await expect(section).toBeVisible()
    const title = section.getByRole('heading', { name: 'Вижте ни в действие' })
    await expect(title).toBeVisible()
    const titleBox = await title.boundingBox()
    const reelBox = await section.locator('.reel-card').boundingBox()
    expect(reelBox.y).toBeGreaterThan(titleBox.y + titleBox.height - 1)
  })

  test('has a clearly visible play button in the centre of the reel', async ({ page }) => {
    await page.goto('/#/tabata')
    const card = reelSection(page).locator('.reel-card')
    const play = card.getByRole('button', { name: /Пусни видеото/ })
    await play.scrollIntoViewIfNeeded()
    await expect(play).toBeVisible()

    const cardBox = await card.boundingBox()
    const playIcon = await card.locator('.reel-play').boundingBox()
    const centre = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })
    expect(Math.abs(centre(playIcon).x - centre(cardBox).x)).toBeLessThan(3)
    expect(Math.abs(centre(playIcon).y - centre(cardBox).y)).toBeLessThan(3)
    expect(playIcon.width).toBeGreaterThanOrEqual(56) // big enough to see and tap

    // Portrait, like a reel on a phone.
    expect(cardBox.height).toBeGreaterThan(cardBox.width * 1.5)
  })

  test('loads nothing from Instagram until the visitor taps play', async ({ page }) => {
    const instagramRequests = []
    page.on('request', (r) => { if (r.url().includes('instagram.com')) instagramRequests.push(r.url()) })
    await page.goto('/#/tabata')
    await reelSection(page).scrollIntoViewIfNeeded()
    await page.waitForLoadState('networkidle')
    expect(instagramRequests).toEqual([])
    await expect(reelSection(page).locator('iframe')).toHaveCount(0)
  })

  test('tapping play loads the reel in Instagram\'s player', async ({ page }) => {
    await page.goto('/#/tabata')
    await reelSection(page).getByRole('button', { name: /Пусни видеото/ }).click()
    const player = reelSection(page).locator('iframe')
    await expect(player).toHaveAttribute('src', EMBED_URL)
    await expect(player).toHaveAttribute('title', /Instagram/)
    await expect(player).toBeVisible()
    await expect(reelSection(page).getByRole('button', { name: /Пусни видеото/ })).toHaveCount(0)
  })

  test('has a link to watch the reel on Instagram', async ({ page }) => {
    await page.goto('/#/tabata')
    const link = reelSection(page).getByRole('link', { name: /Instagram/ })
    await expect(link).toHaveAttribute('href', REEL_URL)
    await expect(link).toHaveAttribute('target', '_blank')
  })

  test('no sideways scrolling on the Табата page', async ({ page }) => {
    await page.goto('/#/tabata')
    await reelSection(page).scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })

  test('other workout pages have no reel yet', async ({ page }) => {
    for (const slug of ['fitball', 'yoga', 'pilates', 'callanetics', 'folk-dance']) {
      await page.goto(`/#/${slug}`)
      await expect(page.locator('main h1')).toBeVisible()
      await expect(reelSection(page)).toHaveCount(0)
    }
  })
})

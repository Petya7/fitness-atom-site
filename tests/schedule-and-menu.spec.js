import { test, expect } from '@playwright/test'

test.describe('Програма page', () => {
  test('has no "График" label above the heading', async ({ page }) => {
    await page.goto('/#/schedule')
    await expect(page.locator('main h1')).toHaveText('Седмична програма')
    await expect(page.locator('main').getByText(/^график$/i)).toHaveCount(0)
  })

  test('shows group prices under the intro text and above the weekly schedule', async ({ page }) => {
    await page.goto('/#/schedule')

    const prices = page.getByRole('region', { name: 'Цени групови' })
    await expect(prices).toBeVisible()
    await expect(prices.getByRole('heading', { name: 'Цени групови' })).toBeVisible()

    const items = prices.getByRole('listitem')
    await expect(items).toHaveCount(3)
    await expect(items.nth(0)).toHaveText(/1 посещение\s*7\s*€/)
    await expect(items.nth(1)).toHaveText(/8 посещения\s*47\s*€/)
    await expect(items.nth(2)).toHaveText(/12 посещения\s*55\s*€/)

    // Order on the page: intro text → prices → weekly schedule.
    const introBox = await page.locator('main .lead').boundingBox()
    const pricesBox = await prices.boundingBox()
    const scheduleBox = await page.locator('main .schedule-grid').boundingBox()
    expect(pricesBox.y).toBeGreaterThan(introBox.y + introBox.height - 1)
    expect(scheduleBox.y).toBeGreaterThan(pricesBox.y + pricesBox.height - 1)
  })

  test('prices sit in their own soft orange box, separate from the schedule', async ({ page }) => {
    await page.goto('/#/schedule')
    const prices = page.getByRole('region', { name: 'Цени групови' })
    const box = await prices.evaluate((el) => {
      const s = getComputedStyle(el)
      return { background: s.backgroundColor, border: s.borderTopColor, borderWidth: s.borderTopWidth, radius: parseFloat(s.borderTopLeftRadius) }
    })
    expect(box.background).toBe('rgb(255, 240, 223)') // same peach as the note under the schedule
    expect(box.border).toBe('rgb(255, 212, 173)')
    expect(box.borderWidth).toBe('1px')
    expect(box.radius).toBeGreaterThan(10)

    // Clear gap between the box and the weekly schedule.
    const pricesBox = await prices.boundingBox()
    const scheduleBox = await page.locator('main .schedule-grid').boundingBox()
    expect(scheduleBox.y - (pricesBox.y + pricesBox.height)).toBeGreaterThanOrEqual(30)
  })

  test('price cards fit on screen without sideways scrolling', async ({ page }) => {
    await page.goto('/#/schedule')
    await expect(page.getByRole('region', { name: 'Цени групови' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
})

test.describe('Phone menu', () => {
  test.skip(({ isMobile }) => !isMobile, 'The ☰ menu exists only on small screens')

  const menu = (page) => page.locator('.main-nav')
  const openMenu = async (page) => {
    await page.locator('.mobile-toggle').click()
    await expect(menu(page)).toHaveClass(/is-open/)
  }

  test('closes when tapping the X button', async ({ page }) => {
    await page.goto('/')
    await openMenu(page)
    await page.locator('.mobile-toggle').click()
    await expect(menu(page)).not.toHaveClass(/is-open/)
  })

  test('closes when tapping outside it, without tapping what is underneath', async ({ page }) => {
    await page.goto('/')
    await openMenu(page)

    // Tap near the bottom of the screen, below the menu, where page content is.
    const viewport = page.viewportSize()
    await page.touchscreen.tap(viewport.width / 2, viewport.height - 40)

    await expect(menu(page)).not.toHaveClass(/is-open/)
    await expect(page).not.toHaveURL(/#\/(?!home)./) // still on the home page
    await expect(page.locator('main h1')).toContainText('Груповите тренировки')
  })

  test('closes when tapping the header area outside the menu', async ({ page }) => {
    await page.goto('/#/schedule')
    await openMenu(page)
    const headerBox = await page.locator('.site-header').boundingBox()
    // Empty space in the header between the logo and the ☰ button.
    await page.touchscreen.tap(headerBox.width / 2, headerBox.y + headerBox.height / 2)
    await expect(menu(page)).not.toHaveClass(/is-open/)
    await expect(page.locator('main h1')).toHaveText('Седмична програма')
  })

  test('stays open when tapping inside it', async ({ page }) => {
    await page.goto('/')
    await openMenu(page)
    await menu(page).getByRole('button', { name: /Групови тренировки/ }).click()
    await expect(menu(page)).toHaveClass(/is-open/)
    await expect(page.locator('.workout-menu')).toHaveClass(/is-open/)
  })

  test('menu links still work', async ({ page }) => {
    await page.goto('/')
    await openMenu(page)
    await menu(page).getByRole('button', { name: 'Програма' }).click()
    await expect(page.locator('main h1')).toHaveText('Седмична програма')
    await expect(menu(page)).not.toHaveClass(/is-open/)
  })
})

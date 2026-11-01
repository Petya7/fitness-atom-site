import { test, expect } from '@playwright/test'

const heading = (page) => page.locator('main h1').first()

// Opens a workout from the cards on the current page (works on desktop and mobile).
const openWorkoutCard = (page, name) => page.locator('main .workout-card', { hasText: name }).first().click()

test.describe('Back button', () => {
  test('goes back through every page visited, then forward again', async ({ page }) => {
    await page.goto('/')
    await expect(heading(page)).toContainText('Груповите тренировки')

    await page.getByRole('button', { name: 'Виж тренировките' }).click()
    await expect(page).toHaveURL(/#\/workouts$/)
    await expect(heading(page)).toHaveText('Групови тренировки')

    await openWorkoutCard(page, 'Йога')
    await expect(page).toHaveURL(/#\/yoga$/)
    await expect(heading(page)).toHaveText('Йога')

    await page.goBack()
    await expect(page).toHaveURL(/#\/workouts$/)
    await expect(heading(page)).toHaveText('Групови тренировки')

    await page.goBack()
    await expect(heading(page)).toContainText('Груповите тренировки')

    await page.goForward()
    await expect(heading(page)).toHaveText('Групови тренировки')

    await page.goForward()
    await expect(heading(page)).toHaveText('Йога')
  })

  test('returns to the schedule after opening a class from it', async ({ page }) => {
    await page.goto('/#/schedule')
    await expect(heading(page)).toHaveText('Седмична програма')

    await page.locator('main .class-link').first().click()
    await expect(page).not.toHaveURL(/#\/schedule$/)

    await page.goBack()
    await expect(page).toHaveURL(/#\/schedule$/)
    await expect(heading(page)).toHaveText('Седмична програма')
  })

  test('the in-page "Всички тренировки" link adds a normal history step', async ({ page }) => {
    await page.goto('/#/pilates')
    await expect(heading(page)).toHaveText('Пилатес')

    await page.getByRole('button', { name: 'Всички тренировки' }).first().click()
    await expect(heading(page)).toHaveText('Групови тренировки')

    await page.goBack()
    await expect(heading(page)).toHaveText('Пилатес')
  })

  test('returns to the same spot on the page, not the top', async ({ page }) => {
    // Open each workout card on the home page, go back, and check we land on that card again.
    // Before the fix this failed only some of the time, so every card is tried.
    await page.goto('/')
    for (const name of ['Табата', 'Фитбол', 'Йога', 'Пилатес', 'Каланетика', 'Народни танци']) {
      const card = page.locator('main .workout-card', { hasText: name })
      await card.scrollIntoViewIfNeeded()
      const scrollBefore = await page.evaluate(() => Math.round(window.scrollY))

      await card.click()
      await expect(heading(page)).toHaveText(name)
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
      await page.waitForTimeout(400) // look at the page for a moment, like a real visitor

      await page.goBack()
      await expect(heading(page)).toContainText('Груповите тренировки')
      await page.waitForTimeout(300) // give a late, wrong scroll jump time to show up
      expect(Math.abs(await page.evaluate(() => Math.round(window.scrollY)) - scrollBefore), `scroll after going back from ${name}`).toBeLessThanOrEqual(5)
    }
  })

  test('with no previous page on the site, back leaves the site like any website', async ({ page }) => {
    // Simulate opening a shared link (e.g. from Viber): another page first, then the deep link.
    await page.goto('about:blank')
    await page.goto('/#/yoga')
    await expect(heading(page)).toHaveText('Йога')

    await page.goBack()
    await expect(page).toHaveURL('about:blank')
  })

  test('a shared link to a page still opens that page after a refresh', async ({ page }) => {
    await page.goto('/#/tabata')
    await expect(heading(page)).toHaveText('Табата')
    await page.reload()
    await expect(heading(page)).toHaveText('Табата')
  })

  test('closes the mobile menu when going back', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The ☰ menu exists only on small screens')
    await page.goto('/')
    await page.getByRole('button', { name: 'Виж тренировките' }).click()
    await expect(heading(page)).toHaveText('Групови тренировки')

    await page.locator('.mobile-toggle').click()
    await expect(page.locator('.main-nav')).toHaveClass(/is-open/)

    await page.goBack()
    await expect(heading(page)).toContainText('Груповите тренировки')
    await expect(page.locator('.main-nav')).not.toHaveClass(/is-open/)
  })
})

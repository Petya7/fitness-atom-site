import { test, expect } from '@playwright/test'

// When a line break (<br>) is hidden on some screen sizes, the words on each side of it
// must still have a space between them, or they get glued together ("препоръчамеподходяща").
const gluedWordsAtHiddenBreaks = (page) => page.evaluate(() => {
  const textAround = (node, direction) => {
    let n = direction === 'before' ? node.previousSibling : node.nextSibling
    while (n && n.nodeType !== Node.TEXT_NODE && !n.textContent) n = direction === 'before' ? n.previousSibling : n.nextSibling
    return n ? n.textContent : ''
  }
  return [...document.querySelectorAll('br')]
    .filter((br) => getComputedStyle(br).display === 'none')
    .map((br) => ({ before: textAround(br, 'before'), after: textAround(br, 'after') }))
    .filter(({ before, after }) => before && after && !/\s$/.test(before) && !/^\s/.test(after))
    .map(({ before, after }) => `${before.trim().split(/\s+/).pop()}|${after.trim().split(/\s+/)[0]}`)
})

for (const path of ['/', '/#/schedule', '/#/workouts', '/#/yoga']) {
  test(`no words glued together at hidden line breaks on ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('main h1').first()).toBeVisible()
    expect(await gluedWordsAtHiddenBreaks(page)).toEqual([])
  })
}

test('the dark "Първата тренировка" box reads correctly', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.home-cta p')).toContainText('препоръчаме подходяща група')
})

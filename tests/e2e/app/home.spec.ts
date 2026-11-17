import { expect, test } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'

test('Home opens first and "Design file" reuses the blank startup tab', async ({ page }) => {
  await page.goto('/')
  const newDesign = page.getByRole('button', { name: 'Design file', exact: true })
  await expect(newDesign).toBeVisible()
  await expect(page.getByTestId('canvas-element')).toHaveCount(0)

  await newDesign.click()
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  // One document tab means the tab strip stays hidden; a second "Untitled"
  // tab would have been left behind if the startup tab were not reused.
  await expect(page.getByTestId('tabbar')).toHaveCount(0)
  expect(await page.evaluate(() => window.openWeave?.getStore?.()?.state.documentName)).toBe(
    'Untitled'
  )
  canvas.assertNoErrors()
})

test('bare embeds and the demo skip Home', async ({ page }) => {
  for (const url of ['/?test&no-chrome', '/demo']) {
    await page.goto(url)
    await expect(page.getByTestId('canvas-element')).toBeVisible({ timeout: 30000 })
    await expect(page.getByRole('button', { name: 'Design file', exact: true })).toHaveCount(0)
  }
})

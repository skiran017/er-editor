import { expect, test } from '@playwright/test'

test.describe('App boot smoke', () => {
  test('root page renders a React Flow canvas with controls', async ({ page }) => {
    await page.goto('/')

    const canvas = page.locator('.react-flow')
    await expect(canvas).toBeVisible()

    const zoomIn = page.getByLabel(/zoom in/i)
    const zoomOut = page.getByLabel(/zoom out/i)
    const fitView = page.getByLabel(/fit view/i)
    await expect(zoomIn).toBeVisible()
    await expect(zoomOut).toBeVisible()
    await expect(fitView).toBeVisible()
  })

  test('there are no console errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    expect(errors).toEqual([])
  })
})

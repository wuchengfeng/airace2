import { test, expect } from '@playwright/test'

test('history page header visible', async ({ page }) => {
  await page.goto('/app/history')
  await expect(page.getByText('练习历史')).toBeVisible()
})

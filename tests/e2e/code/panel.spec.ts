import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

const editor = useEditorSetup()

function codeTab() {
  return editor.page.getByTestId('properties-tab-code')
}

function designTab() {
  return editor.page.getByTestId('properties-tab-design')
}

function codePanel() {
  return editor.page.getByTestId('code-panel')
}

function codePanelEmpty() {
  return editor.page.getByTestId('code-panel-empty')
}

function formatButton(format: 'openweave' | 'tailwind') {
  return editor.page.getByTestId(`code-format-${format}`)
}

function copyButton() {
  return editor.page.getByTestId('code-copy')
}

test('Code tab shows empty state with no selection', async () => {
  await codeTab().click()
  await expect(codePanelEmpty()).toBeVisible()
  await expect(codePanelEmpty()).toContainText('Select a layer')
})

test('selecting a rectangle shows JSX code', async () => {
  await editor.canvas.drawRect(100, 100, 200, 150)
  await editor.canvas.waitForRender()

  await expect(codePanel()).toBeVisible()

  const code = await codePanel().textContent()
  expect(code).toContain('Rectangle')
})

test('format buttons switch between OpenWeave and Tailwind output', async () => {
  await expect(formatButton('openweave')).toBeVisible()
  await expect(formatButton('tailwind')).toBeVisible()
  await expect(formatButton('openweave')).toHaveClass(/bg-accent/)

  await formatButton('tailwind').click()
  await expect(formatButton('tailwind')).toHaveClass(/bg-accent/)

  const code = await codePanel().textContent()
  expect(code).toContain('div')

  await formatButton('openweave').click()
  await expect(formatButton('openweave')).toHaveClass(/bg-accent/)
})

test('copy button works and shows confirmation', async () => {
  await copyButton().click()

  await expect(copyButton()).toContainText('Copied')

  await editor.page.waitForTimeout(2500)
  await expect(copyButton()).toContainText('Copy')
})

test('deselecting shows empty state again', async () => {
  await editor.page.keyboard.press('Escape')
  await editor.canvas.waitForRender()

  await expect(codePanelEmpty()).toBeVisible()
})

test('selecting a frame shows Frame in JSX', async () => {
  // Create a frame via store to avoid click-targeting issues
  await editor.page.evaluate(() => {
    const store = window.openWeave?.getStore?.()
    if (!store) throw new Error('OpenWeave store not initialized')
    const id = store.createShape('FRAME', 300, 100, 200, 200)
    store.select([id])
  })
  await editor.canvas.waitForRender()

  const code = await codePanel().textContent()
  expect(code).toContain('Frame')
})

test('switching back to Design tab works', async () => {
  await designTab().click()

  await expect(
    editor.page
      .getByTestId('design-panel-single')
      .or(editor.page.getByTestId('design-panel-empty'))
      .first()
  ).toBeVisible()
})

test('shows import errors in the Code panel', async () => {
  await codeTab().click()
  await editor.page.getByTestId('code-import-toggle').click()
  await editor.page.evaluate(() => {
    const store = window.openWeave?.getStore?.()
    if (!store) throw new Error('OpenWeave store not initialized')
    const importDOMText = store.importDOMText
    store.importDOMText = async () => {
      store.importDOMText = importDOMText
      throw new Error('CSS import failed')
    }
  })

  await editor.page.getByTestId('code-import-html').fill('<div class="card">Broken DOM</div>')
  await editor.page.getByTestId('code-import').click()

  await expect(editor.page.getByTestId('code-import-error')).toBeVisible()
  await expect(editor.page.getByTestId('code-import-error')).toContainText('CSS import failed')

  await editor.page.getByTestId('code-import-html').fill('<div class="card">Recovered</div>')
  await expect(editor.page.getByTestId('code-import-error')).toBeHidden()
  await editor.page.getByTestId('code-import-toggle').click()
})

test('imports HTML and CSS into the canvas', async () => {
  await codeTab().click()
  await editor.page.getByTestId('code-import-toggle').click()
  await editor.page.getByTestId('code-import-html').fill('<div class="card">Hello DOM</div>')
  await editor.page
    .getByTestId('code-import-css')
    .fill('.card { width: 240px; height: 120px; padding: 16px; background: #ffffff; }')
  await editor.page.getByTestId('code-import').click()
  await editor.page.waitForFunction(() => {
    const store = window.openWeave?.getStore?.()
    return store?.graph.getAllNodes().some((node) => node.name.includes('Hello DOM'))
  })
  await editor.canvas.waitForRender()

  const imported = await editor.page.evaluate(() => {
    const store = window.openWeave?.getStore?.()
    if (!store) throw new Error('OpenWeave store not initialized')
    return store.graph.getAllNodes().some((node) => node.name.includes('Hello DOM'))
  })
  expect(imported).toBe(true)
})

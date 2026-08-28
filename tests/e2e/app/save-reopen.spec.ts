import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

const editor = useEditorSetup()

test('saved .fig round-trips through save-as and reopen', async () => {
  test.setTimeout(60000)

  const result = await editor.page.evaluate(async () => {
    const store = window.openWeave?.getStore?.()
    if (!store) throw new Error('OpenWeave store not initialized')

    store.createShape('RECTANGLE', 100, 100, 200, 150)
    store.createShape('ELLIPSE', 400, 120, 120, 120)

    const chunks: Uint8Array[] = []
    const handle = {
      name: 'roundtrip.fig',
      getFile: async () => new File(chunks as BlobPart[], 'roundtrip.fig'),
      createWritable: async () => ({
        write: async (data: Uint8Array) => {
          chunks.push(data)
        },
        close: async () => undefined
      }),
      isSameEntry: async () => false,
      queryPermission: async () => 'granted'
    } as unknown as FileSystemFileHandle
    window.showSaveFilePicker = async () => handle

    await store.saveFigFileAs()
    const savedBytes = chunks.reduce((n, c) => n + c.byteLength, 0)

    // clear the canvas so reopened content is unambiguous
    const pageBefore = store.graph.getPages()[0]
    for (const child of store.graph.getChildren(pageBefore.id)) store.graph.deleteNode(child.id)

    const file = new File(chunks as BlobPart[], 'roundtrip.fig', {
      type: 'application/octet-stream'
    })
    await store.openFigFile(file, handle)

    const pages = store.graph.getPages()
    const children = pages[0] ? store.graph.getChildren(pages[0].id) : []
    return {
      savedBytes,
      loading: store.state.loading,
      documentName: store.state.documentName,
      pageCount: pages.length,
      childTypes: children.map((n) => n.type).sort()
    }
  })

  expect(result.savedBytes).toBeGreaterThan(0)
  expect(result.loading).toBe(false)
  expect(result.documentName).toBe('roundtrip')
  expect(result.pageCount).toBe(1)
  expect(result.childTypes).toEqual(['ELLIPSE', 'RECTANGLE'])
  editor.canvas.assertNoErrors()
})

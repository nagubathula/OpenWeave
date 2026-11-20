import { describe, expect, test } from 'bun:test'

import { readPluginFolder, type PluginSourceFile } from '@/app/plugins/install'
import { parsePluginManifest, PluginManifestError } from '@/app/plugins/manifest'
import { pluginContentSecurityPolicy, pluginUIDocument } from '@/app/plugins/ui-document'

function file(path: string, contents: string): PluginSourceFile {
  return { path, file: new Blob([contents]) }
}

describe('plugin manifest', () => {
  test('reads the fields OpenWeave uses', () => {
    const manifest = parsePluginManifest(
      JSON.stringify({
        name: 'Rename Layers',
        id: '123456',
        api: '1.0.0',
        main: 'dist/code.js',
        ui: 'dist/ui.html',
        editorType: ['figma', 'figjam'],
        menu: [
          { name: 'Uppercase', command: 'upper' },
          { separator: true },
          { name: 'More', menu: [{ name: 'Lowercase', command: 'lower' }] },
          { name: 'Broken' }
        ],
        networkAccess: { allowedDomains: ['https://api.example.com'] }
      })
    )
    expect(manifest).toMatchObject({
      id: '123456',
      name: 'Rename Layers',
      main: 'dist/code.js',
      ui: 'dist/ui.html',
      networkAccess: { allowedDomains: ['https://api.example.com'] }
    })
    expect(manifest.menu).toEqual([
      { name: 'Uppercase', command: 'upper' },
      { separator: true },
      { name: 'More', menu: [{ name: 'Lowercase', command: 'lower' }] }
    ])
  })

  test('derives an id from the name when the manifest has none', () => {
    expect(parsePluginManifest('{"name":"My Plugin!","main":"code.js"}').id).toBe('my-plugin')
  })

  test('rejects manifests OpenWeave cannot run', () => {
    expect(() => parsePluginManifest('not json')).toThrow(PluginManifestError)
    expect(() => parsePluginManifest('{"main":"code.js"}')).toThrow('needs a "name"')
    expect(() => parsePluginManifest('{"name":"X"}')).toThrow('needs a "main"')
    expect(() =>
      parsePluginManifest('{"name":"X","main":"code.js","editorType":["figjam"]}')
    ).toThrow('Figma design plugins')
  })
})

describe('plugin folder install', () => {
  test('reads code and UI relative to the shallowest manifest', async () => {
    const plugin = await readPluginFolder([
      file('my-plugin/manifest.json', '{"name":"Mine","main":"dist/code.js","ui":"ui.html"}'),
      file('my-plugin/dist/code.js', 'figma.closePlugin()'),
      file('my-plugin/ui.html', '<p>UI</p>'),
      file('my-plugin/node_modules/dep/manifest.json', '{"name":"Dep","main":"x.js"}')
    ])
    expect(plugin).toMatchObject({
      id: 'mine',
      name: 'Mine',
      code: 'figma.closePlugin()',
      ui: '<p>UI</p>'
    })
  })

  test('reads named UI files', async () => {
    const plugin = await readPluginFolder([
      file(
        'manifest.json',
        '{"name":"Multi","main":"code.js","ui":{"main":"a.html","help":"./b.html"}}'
      ),
      file('code.js', ''),
      file('a.html', 'A'),
      file('b.html', 'B')
    ])
    expect(plugin.ui).toEqual({ main: 'A', help: 'B' })
  })

  test('lists every missing file', async () => {
    await expect(
      readPluginFolder([file('p/manifest.json', '{"name":"P","main":"code.js","ui":"ui.html"}')])
    ).rejects.toThrow('Missing plugin files: code.js, ui.html')
    await expect(readPluginFolder([file('code.js', '')])).rejects.toThrow('no manifest.json')
  })
})

describe('plugin UI network policy', () => {
  test('allows everything without networkAccess or with "*"', () => {
    expect(pluginUIDocument('<p>hi</p>')).toBe('<p>hi</p>')
    expect(pluginContentSecurityPolicy(['*'])).toBeNull()
  })

  test('limits connections to the allowed domains', () => {
    const policy = pluginContentSecurityPolicy(['https://api.example.com', 'bad;domain'])
    expect(policy).toContain('connect-src https://api.example.com')
    expect(policy).not.toContain('bad;domain')
    expect(pluginContentSecurityPolicy(['none'])).toContain("connect-src 'none'")
  })

  test('puts the policy before any script in the document', () => {
    const html = pluginUIDocument('<html><head><script>1</script></head></html>', ['none'])
    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('<script>'))
    expect(pluginUIDocument('<script>1</script>', ['none'])).toStartWith('<meta')
  })
})

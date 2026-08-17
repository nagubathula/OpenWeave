'use client'

import React, { useMemo, useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-jsx'
import { BookOpen, Check, ClipboardPaste, Copy, FileInput } from 'lucide-react'

import { useEditor, useI18n, useSceneComputed, useSelectionState } from '@openweave/react'
import { JSX_REFERENCE, selectionToJSX, type JSXFormat } from '@openweave/core/design-jsx'
import { getActiveEditorStore } from '@/app/editor/active-store'
import Tip from '@/components/ui/Tip'

/**
 * Code-export panel: generates JSX for the current selection (OpenWeave or
 * Tailwind flavor), with line-numbered syntax highlighting and copy-to-
 * clipboard. Also hosts an HTML/CSS importer that hands pasted markup to
 * `store.importDOMText`, and a "copy JSX reference" snippet for SDK usage.
 */
export default function CodePanel() {
  const editor = useEditor()
  const { dialogs } = useI18n()
  const { selectedIds } = useSelectionState()
  const [format, setFormat] = useState<JSXFormat>('openweave')
  const [copied, setCopied] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)

  const [showImporter, setShowImporter] = useState(false)
  const [importHtml, setImportHtml] = useState('')
  const [importCss, setImportCss] = useState('')
  const [importError, setImportError] = useState('')
  const [importing, setImporting] = useState(false)

  // Re-derive when the scene changes (node edits bump sceneVersion), when the
  // selection changes, or when the output format toggles.
  const sceneVersion = useSceneComputed(() => editor.state.sceneVersion)
  const jsxCode = useMemo(() => {
    const ids = [...selectedIds]
    if (ids.length === 0) return ''
    return selectionToJSX(ids, editor.graph, format)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, sceneVersion, format, editor])

  // Highlighted per-line (rather than as one block) so a line-number gutter
  // can be rendered alongside the code.
  const highlightedLines = useMemo(() => {
    if (!jsxCode) return []
    const grammar = Prism.languages.jsx ?? Prism.languages.javascript
    return jsxCode.split('\n').map((line) => Prism.highlight(line, grammar, 'jsx'))
  }, [jsxCode])

  const copy = async () => {
    if (!jsxCode) return
    try {
      await navigator.clipboard.writeText(jsxCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      // oxlint-ignore-next-line
    } catch {
      // clipboard blocked — ignore
    }
  }

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(JSX_REFERENCE)
      setCopiedRef(true)
      setTimeout(() => setCopiedRef(false), 2000)
      // oxlint-ignore-next-line
    } catch {
      // clipboard blocked — ignore
    }
  }

  const canImport = importHtml.trim().length > 0

  function importErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message
    return 'Import failed. Check the HTML and CSS, then try again.'
  }

  const pasteImportHtml = async () => {
    try {
      setImportError('')
      const text = await navigator.clipboard.readText()
      setImportHtml(text)
    } catch (e) {
      setImportError(importErrorMessage(e))
    }
  }

  const importCode = async () => {
    if (!canImport || importing) return
    try {
      setImporting(true)
      setImportError('')
      const store = getActiveEditorStore()
      await store.importDOMText(importHtml, { cssText: importCss.trim() || undefined })
    } catch (e) {
      setImportError(importErrorMessage(e))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex h-full flex-col" data-test-id="code-panel">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex gap-1" role="tablist" aria-label="Code format">
          {(['openweave', 'tailwind'] as const).map((f) => (
            <button
              key={f}
              type="button"
              data-test-id={`code-format-${f}`}
              onClick={() => setFormat(f)}
              className={
                'rounded px-2 py-0.5 text-[11px] capitalize transition-colors ' +
                (format === f
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted hover:text-surface')
              }
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-test-id="code-import-toggle"
            onClick={() => setShowImporter((v) => !v)}
            aria-pressed={showImporter}
            className={
              'flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-colors ' +
              (showImporter
                ? 'bg-accent text-accent-foreground'
                : 'text-muted hover:text-surface')
            }
          >
            <FileInput className="size-3" />
            Import
          </button>
          <Tip label={dialogs.copyJSXReference}>
            <button
              type="button"
              data-test-id="code-copy-ref"
              onClick={() => void copyReference()}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted transition-colors hover:text-surface"
            >
              {copiedRef ? <Check className="size-3" /> : <BookOpen className="size-3" />}
              {copiedRef ? 'Copied' : 'Reference'}
            </button>
          </Tip>
          <button
            type="button"
            data-test-id="code-copy"
            onClick={() => void copy()}
            disabled={!jsxCode}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted transition-colors hover:text-surface disabled:opacity-40"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {showImporter && (
        <div data-test-id="code-importer" className="shrink-0 border-b border-border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-medium text-surface">Import HTML/CSS</div>
              <div className="text-[11px] text-muted">
                Paste HTML plus optional CSS or compiled Tailwind CSS.
              </div>
            </div>
            <button
              type="button"
              data-test-id="code-paste-import"
              onClick={() => void pasteImportHtml()}
              className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted transition-colors hover:text-surface"
            >
              <ClipboardPaste className="size-3" />
              Paste
            </button>
          </div>
          <textarea
            data-test-id="code-import-html"
            value={importHtml}
            onChange={(e) => {
              setImportHtml(e.target.value)
              if (importError) setImportError('')
            }}
            aria-label="HTML to import"
            className="mb-2 h-28 w-full resize-none rounded border border-border bg-panel px-2 py-1.5 font-mono text-xs text-surface outline-none placeholder:text-muted/50 focus:border-accent"
            placeholder='<div class="card">Hello</div>'
            spellCheck={false}
          />
          <textarea
            data-test-id="code-import-css"
            value={importCss}
            onChange={(e) => {
              setImportCss(e.target.value)
              if (importError) setImportError('')
            }}
            aria-label="CSS to import"
            className="mb-2 h-20 w-full resize-none rounded border border-border bg-panel px-2 py-1.5 font-mono text-xs text-surface outline-none placeholder:text-muted/50 focus:border-accent"
            placeholder=".card { width: 240px; padding: 16px; border-radius: 12px; background: white; }"
            spellCheck={false}
          />
          {importError && (
            <div
              data-test-id="code-import-error"
              className="mb-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200"
            >
              {importError}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted">Import replaces the current document.</span>
            <button
              type="button"
              data-test-id="code-import"
              onClick={() => void importCode()}
              disabled={!canImport || importing}
              className="rounded bg-accent px-2 py-1 text-[11px] text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? 'Importing…' : 'Import to canvas'}
            </button>
          </div>
        </div>
      )}

      {jsxCode ? (
        <div className="scrollbar-thin flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-surface">
          {highlightedLines.map((html, i) => (
            <div key={i} className="flex">
              <span
                className="mr-3 shrink-0 select-none text-right text-muted/40"
                style={{ minWidth: '2em' }}
              >
                {i + 1}
              </span>
              <pre className="m-0 min-w-0 flex-1 whitespace-pre-wrap break-words">
                <code className="language-jsx" dangerouslySetInnerHTML={{ __html: html }} />
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <div
          data-test-id="code-panel-empty"
          className="flex flex-1 items-center justify-center p-4 text-center text-xs text-muted"
        >
          Select a layer to generate its code.
        </div>
      )}
    </div>
  )
}

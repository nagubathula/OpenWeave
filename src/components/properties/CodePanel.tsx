'use client'

import React, { useMemo, useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-jsx'
import { Check, Copy } from 'lucide-react'

import { useEditor, useSceneComputed, useSelectionState } from '@openweave/react'
import { selectionToJSX, type JSXFormat } from '@openweave/core/design-jsx'

/**
 * Code-export panel: generates JSX for the current selection (OpenWeave or
 * Tailwind flavor), with syntax highlighting and copy-to-clipboard.
 */
export default function CodePanel() {
  const editor = useEditor()
  const { selectedIds } = useSelectionState()
  const [format, setFormat] = useState<JSXFormat>('openweave')
  const [copied, setCopied] = useState(false)

  // Re-derive when the scene changes (node edits bump sceneVersion), when the
  // selection changes, or when the output format toggles.
  const sceneVersion = useSceneComputed(() => editor.state.sceneVersion)
  const jsxCode = useMemo(() => {
    const ids = [...selectedIds]
    if (ids.length === 0) return ''
    return selectionToJSX(ids, editor.graph, format)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, sceneVersion, format, editor])

  const highlighted = useMemo(() => {
    if (!jsxCode) return ''
    const grammar = Prism.languages.jsx ?? Prism.languages.javascript
    return Prism.highlight(jsxCode, grammar, 'jsx')
  }, [jsxCode])

  const copy = async () => {
    if (!jsxCode) return
    try {
      await navigator.clipboard.writeText(jsxCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked — ignore
    }
  }

  return (
    <div className="flex h-full flex-col">
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
        <button
          type="button"
          data-test-id="code-copy"
          onClick={copy}
          disabled={!jsxCode}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted transition-colors hover:text-surface disabled:opacity-40"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {jsxCode ? (
        <pre className="scrollbar-thin flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-surface">
          <code
            className="language-jsx"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-muted">
          Select a layer to generate its code.
        </div>
      )}
    </div>
  )
}

'use client'

import { Check, Copy, Layers, Palette, Terminal } from 'lucide-react'
import Prism from 'prismjs'
import 'prismjs/components/prism-jsx'
import React, { useMemo, useState } from 'react'

import { colorToCSS, colorToHex } from '@openweave/core/color'
import { selectionToJSX } from '@openweave/core/design-jsx'
import { collectTailwindClasses } from '@openweave/core/io/formats/jsx/tailwind-classes'
import { useEditor, useSceneComputed, useSelectionState } from '@openweave/react'
import type { SceneGraph, SceneNode } from '@openweave/scene-graph'

import { generateNodeCSS } from './codegen'

export type DevCodeFormat = 'css' | 'tailwind' | 'jsx'

interface BoundTokenInfo {
  field: string
  label: string
  variableId: string
  name: string
  collectionName?: string
  resolvedType?: string
  cssVar: string
  resolvedValue?: string
  colorPreview?: string
}

function extractBoundTokens(node: SceneNode, graph: SceneGraph): BoundTokenInfo[] {
  const tokens: BoundTokenInfo[] = []
  const fieldLabels: Record<string, string> = {
    'fills/0/color': 'Fill Color',
    'strokes/0/color': 'Stroke Color',
    width: 'Width',
    height: 'Height',
    cornerRadius: 'Corner Radius',
    itemSpacing: 'Gap / Spacing',
    paddingTop: 'Padding Top',
    paddingRight: 'Padding Right',
    paddingBottom: 'Padding Bottom',
    paddingLeft: 'Padding Left',
    characters: 'Text Content',
    fontSize: 'Font Size'
  }

  for (const [field, varId] of Object.entries(node.boundVariables)) {
    if (!varId) continue
    const v = graph.variables.get(varId)
    if (!v) continue

    const collection = v.collectionId ? graph.variableCollections.get(v.collectionId) : null
    const sanitized = v.name.replace(/[/\s_]+/g, '-').toLowerCase()
    const cssVar = `var(--${sanitized})`

    let resolvedValue: string | undefined
    let colorPreview: string | undefined

    if (v.type === 'COLOR') {
      const col = graph.resolveColorVariableForNode(node.id, varId)
      if (col) {
        colorPreview = colorToCSS(col)
        resolvedValue = colorToHex(col)
      }
    } else if (v.type === 'FLOAT') {
      const num = graph.resolveNumberVariableForNode(node.id, varId)
      if (num != null) resolvedValue = `${num}px`
    } else if (v.type === 'STRING') {
      const str = graph.resolveStringVariableForNode(node.id, varId)
      if (str != null) resolvedValue = str
    } else if (v.type === 'BOOLEAN') {
      const bool = graph.resolveBooleanVariableForNode(node.id, varId)
      if (bool != null) resolvedValue = String(bool)
    }

    tokens.push({
      field,
      label: fieldLabels[field] ?? field,
      variableId: varId,
      name: v.name,
      collectionName: collection?.name,
      resolvedType: v.type,
      cssVar,
      resolvedValue,
      colorPreview
    })
  }

  return tokens
}

export default function DevPanel() {
  const editor = useEditor()
  const { selectedIds } = useSelectionState()
  const [format, setFormat] = useState<DevCodeFormat>('css')
  const [copied, setCopied] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const sceneVersion = useSceneComputed(() => editor.state.sceneVersion)

  const selectedNode = useMemo(() => {
    if (selectedIds.size === 0) return null
    const firstId = [...selectedIds][0]
    return editor.graph.getNode(firstId) ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, sceneVersion, editor])

  const boundTokens = useMemo(() => {
    if (!selectedNode) return []
    return extractBoundTokens(selectedNode, editor.graph)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode, sceneVersion, editor])

  // Generate code based on active format
  const generatedCode = useMemo(() => {
    if (!selectedNode) return ''
    const ids = [...selectedIds]
    if (format === 'css') {
      return generateNodeCSS(selectedNode, editor.graph)
    }
    if (format === 'tailwind') {
      const classes = collectTailwindClasses(selectedNode, editor.graph).join(' ')
      const jsx = selectionToJSX([selectedNode.id], editor.graph, 'tailwind')
      return `/* Tailwind Classes */\n${classes}\n\n/* JSX Output */\n${jsx}`
    }
    return selectionToJSX(ids, editor.graph, 'openweave')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode, selectedIds, format, sceneVersion, editor])

  const highlightedLines = useMemo(() => {
    if (!generatedCode) return []
    const grammar =
      format === 'css'
        ? (Prism.languages.css ?? Prism.languages.javascript)
        : (Prism.languages.jsx ?? Prism.languages.javascript)
    const lang = format === 'css' ? 'css' : 'jsx'
    return generatedCode.split('\n').map((line) => Prism.highlight(line, grammar, lang))
  }, [generatedCode, format])

  const copyCode = async () => {
    if (!generatedCode) return
    try {
      await navigator.clipboard.writeText(generatedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard write failed
    }
  }

  const copyTokenVar = async (token: BoundTokenInfo) => {
    try {
      await navigator.clipboard.writeText(token.cssVar)
      setCopiedToken(token.field)
      setTimeout(() => setCopiedToken(null), 1500)
    } catch {
      // clipboard write failed
    }
  }

  if (!selectedNode) {
    return (
      <div
        data-test-id="dev-panel-empty"
        className="flex flex-1 flex-col items-center justify-center p-6 text-center"
      >
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <Terminal className="size-5" />
        </div>
        <div className="text-xs font-semibold text-surface">Dev Mode Active</div>
        <div className="mt-1 text-[11px] leading-normal text-muted max-w-56">
          Select any element to inspect design tokens, box model dimensions, and generate code.
        </div>
        <div className="mt-4 rounded-md border border-border/60 bg-muted/10 px-3 py-2 text-[10px] text-muted">
          Hover over layers on canvas for interactive distance redlines.
        </div>
      </div>
    )
  }

  return (
    <div data-test-id="dev-panel" className="flex h-full flex-col overflow-y-auto">
      {/* Node Overview Header */}
      <div className="border-b border-border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Layers className="size-3.5 shrink-0 text-emerald-400" />
            <span className="truncate text-xs font-semibold text-surface">{selectedNode.name}</span>
          </div>
          <span className="rounded bg-muted/20 px-1.5 py-0.5 text-[10px] uppercase font-mono text-muted">
            {selectedNode.type}
          </span>
        </div>

        {/* Box model metrics */}
        <div className="mt-2.5 grid grid-cols-4 gap-1.5 rounded-md border border-border/60 bg-panel/80 p-2 text-center text-[11px] font-mono">
          <div>
            <div className="text-[10px] text-muted">W</div>
            <div className="font-medium text-surface">{Math.round(selectedNode.width)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted">H</div>
            <div className="font-medium text-surface">{Math.round(selectedNode.height)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted">X</div>
            <div className="text-muted">{Math.round(selectedNode.x)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted">Y</div>
            <div className="text-muted">{Math.round(selectedNode.y)}</div>
          </div>
        </div>

        {/* Padding & Gap if Auto-layout */}
        {(selectedNode.layoutMode === 'HORIZONTAL' || selectedNode.layoutMode === 'VERTICAL') && (
          <div className="mt-2 flex items-center justify-between rounded border border-border/40 bg-muted/5 px-2.5 py-1.5 text-[11px]">
            <span className="text-muted">Padding</span>
            <span className="font-mono text-surface">
              {Math.round(selectedNode.paddingTop)} / {Math.round(selectedNode.paddingRight)} /{' '}
              {Math.round(selectedNode.paddingBottom)} / {Math.round(selectedNode.paddingLeft)}
            </span>
            <span className="text-muted ml-2">Gap</span>
            <span className="font-mono text-surface">{Math.round(selectedNode.itemSpacing)}</span>
          </div>
        )}
      </div>

      {/* Design Tokens & Variables Inspector */}
      <div className="border-b border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-surface">
            <Palette className="size-3 text-emerald-400" />
            <span>Design Tokens</span>
          </div>
          <span className="text-[10px] text-muted">{boundTokens.length} bound</span>
        </div>

        {boundTokens.length > 0 ? (
          <div className="space-y-1.5">
            {boundTokens.map((token) => {
              const isCopied = copiedToken === token.field
              return (
                <div
                  key={token.field}
                  data-test-id={`dev-token-${token.field}`}
                  className="group flex items-center justify-between rounded-md border border-border/50 bg-panel px-2.5 py-1.5 text-[11px] transition-colors hover:border-emerald-500/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {token.colorPreview && (
                        <div
                          className="size-3 shrink-0 rounded-full border border-black/20"
                          style={{ backgroundColor: token.colorPreview }}
                        />
                      )}
                      <span className="font-medium text-surface truncate">{token.name}</span>
                      {token.collectionName && (
                        <span className="text-[10px] text-muted">({token.collectionName})</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                      <span>{token.label}</span>
                      {token.resolvedValue && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-surface/80">{token.resolvedValue}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void copyTokenVar(token)}
                    aria-label={`Copy ${token.cssVar}`}
                    className="ml-2 flex size-6 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
                  >
                    {isCopied ? (
                      <Check className="size-3 text-emerald-400" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border/60 p-2.5 text-center text-[11px] text-muted">
            No design tokens bound to this layer.
          </div>
        )}
      </div>

      {/* Code Generator Header & Tabs */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex gap-1" role="tablist" aria-label="Code format">
          {(['css', 'tailwind', 'jsx'] as const).map((f) => (
            <button
              key={f}
              type="button"
              data-test-id={`dev-format-${f}`}
              onClick={() => setFormat(f)}
              className={
                'rounded px-2.5 py-1 text-[11px] uppercase font-mono font-medium transition-colors ' +
                (format === f
                  ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                  : 'text-muted hover:text-surface')
              }
            >
              {f}
            </button>
          ))}
        </div>

        <button
          type="button"
          data-test-id="dev-copy-code"
          onClick={() => void copyCode()}
          className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted transition-colors hover:bg-hover hover:text-surface"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Output Viewer */}
      <div className="scrollbar-thin flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-surface bg-panel/30">
        {highlightedLines.map((html, i) => (
          <div key={i} className="flex">
            <span
              className="mr-3 shrink-0 select-none text-right text-muted/30 font-mono"
              style={{ minWidth: '2em' }}
            >
              {i + 1}
            </span>
            <pre className="m-0 min-w-0 flex-1 whitespace-pre-wrap break-words">
              <code
                className={`language-${format === 'css' ? 'css' : 'jsx'}`}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}

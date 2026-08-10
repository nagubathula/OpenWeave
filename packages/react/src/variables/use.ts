import { useState, useEffect, useMemo, useCallback } from 'react'

import type { Variable } from '@openweave/scene-graph'

import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import { createVariableCollectionActions, createVariableValueActions } from '#react/variables/helpers'

export function useVariables() {
  const editor = useEditor()
  const [searchTerm, setSearchTerm] = useState('')

  const collections = useSceneComputed(() => editor.getCollections())

  const [activeCollectionId, setActiveCollectionId] = useState<string>(
    () => collections[0]?.id ?? ''
  )

  useEffect(() => {
    if (!activeCollectionId && collections[0]) {
      setActiveCollectionId(collections[0].id)
    }
  }, [collections, activeCollectionId])

  const activeCollection = useMemo(
    () => editor.getCollection(activeCollectionId) ?? null,
    [editor, activeCollectionId]
  )

  const activeModes = useMemo(
    () => activeCollection?.modes ?? [],
    [activeCollection]
  )

  const variables = useSceneComputed(() => {
    if (!activeCollectionId) return [] as Variable[]
    const all = editor.getVariablesForCollection(activeCollectionId)
    if (!searchTerm) return all
    const q = searchTerm.toLowerCase()
    return all.filter((v) => v.name.toLowerCase().includes(q))
  })

  // Ref-like wrapper for compatibility with helper functions
  const activeCollectionIdRef = useMemo(() => ({ value: activeCollectionId }), [activeCollectionId])
  const activeCollectionRef = useMemo(() => ({ value: activeCollection }), [activeCollection])

  const collectionActions = createVariableCollectionActions(editor, activeCollectionIdRef as any)
  const variableActions = createVariableValueActions(editor, () => activeCollectionRef.value)

  const selectCollection = useCallback((id: string) => {
    setActiveCollectionId(id)
  }, [])

  return {
    editor,
    collections,
    activeCollectionId,
    setActiveCollectionId: selectCollection,
    activeCollection,
    activeModes,
    variables,
    searchTerm,
    setSearchTerm,
    ...collectionActions,
    ...variableActions
  }
}

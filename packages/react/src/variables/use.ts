import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'
import {
  createVariableCollectionActions,
  createVariableValueActions
} from '#react/variables/helpers'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'

import type { Variable } from '@openweave/scene-graph'

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

  const activeModes = useMemo(() => activeCollection?.modes ?? [], [activeCollection])

  const variables = useSceneComputed(() => {
    if (!activeCollectionId) return [] as Variable[]
    const all = editor.getVariablesForCollection(activeCollectionId)
    if (!searchTerm) return all
    const q = searchTerm.toLowerCase()
    return all.filter((v) => v.name.toLowerCase().includes(q))
  })

  // Live accessor so memoized actions always read/write the current React state.
  const activeIdRef = useRef(activeCollectionId)
  activeIdRef.current = activeCollectionId

  const collectionActions = useMemo(
    () =>
      createVariableCollectionActions(editor, {
        get: () => activeIdRef.current,
        set: (id) => setActiveCollectionId(id)
      }),
    [editor]
  )
  const variableActions = useMemo(
    () =>
      createVariableValueActions(editor, () => editor.getCollection(activeIdRef.current) ?? null),
    [editor]
  )

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

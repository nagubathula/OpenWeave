import React, { useState, useRef, useCallback, useEffect } from 'react'
import { blurTarget } from '#react/shared/dom-events'

export interface InlineRenameState<T extends string> {
  editingId: T | null
  start: (id: T, currentName: string) => void
  focusInput: (input: HTMLInputElement | null) => void
  commit: (id: T, eventOrInput: React.SyntheticEvent<HTMLInputElement> | HTMLInputElement | Event) => void
  cancel: () => void
  onKeydown: (e: React.KeyboardEvent<HTMLInputElement> | KeyboardEvent) => void
}

export function useInlineRename<T extends string>(
  onCommit: (id: T, newName: string) => void
): InlineRenameState<T> {
  const [editingId, setEditingId] = useState<T | null>(null)
  const originalNameRef = useRef('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const start = useCallback((id: T, currentName: string) => {
    originalNameRef.current = currentName
    setEditingId(id)
  }, [])

  const focusInput = useCallback((input: HTMLInputElement | null) => {
    if (!input) return
    inputRef.current = input
    requestAnimationFrame(() => {
      input.focus()
      input.select()
    })
  }, [])

  const cancel = useCallback(() => {
    setEditingId(null)
    inputRef.current = null
  }, [])

  const commit = useCallback(
    (id: T, eventOrInput: React.SyntheticEvent<HTMLInputElement> | HTMLInputElement | Event) => {
      let input: HTMLInputElement | null = null
      if (eventOrInput instanceof HTMLInputElement) {
        input = eventOrInput
      } else if ('currentTarget' in eventOrInput && eventOrInput.currentTarget instanceof HTMLInputElement) {
        input = eventOrInput.currentTarget
      } else if ('target' in eventOrInput && eventOrInput.target instanceof HTMLInputElement) {
        input = eventOrInput.target as HTMLInputElement
      }

      if (!input) return
      const value = input.value.trim()
      if (value && value !== originalNameRef.current) {
        onCommit(id, value)
      }
      setEditingId(null)
      inputRef.current = null
    },
    [onCommit]
  )

  const onKeydown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement> | KeyboardEvent) => {
      if (e.key === 'Enter') {
        blurTarget('nativeEvent' in e ? e.nativeEvent : e)
        return
      }

      if (e.key === 'Escape') {
        cancel()
      }
    },
    [cancel]
  )

  useEffect(() => {
    if (!editingId || !inputRef.current) return
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        inputRef.current.blur()
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside)
    }
  }, [editingId])

  return { editingId, start, focusInput, commit, cancel, onKeydown }
}

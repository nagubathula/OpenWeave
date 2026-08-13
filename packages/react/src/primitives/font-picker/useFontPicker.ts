import { useState, useMemo, useEffect, useCallback } from 'react'

export type FontAccessState = 'unsupported' | 'prompt' | 'granted' | 'denied'
export type { FontFamilyOption } from './types'

export interface FontAccessController {
  state: () => FontAccessState
  load: () => Promise<string[] | { family: string; source: 'local' | 'web' | 'system' }[]>
}

export interface UseFontPickerOptions {
  modelValue: string
  listFamilies: () => Promise<string[] | { family: string; source: 'local' | 'web' | 'system' }[]>
  localFontAccess?: FontAccessController
  onSelect?: (family: string) => void
  onUpdateModelValue?: (family: string) => void
}

function normalizeOptions(items: string[] | { family: string; source: 'local' | 'web' | 'system' }[]) {
  return items.map((item) => (typeof item === 'string' ? { family: item, source: 'local' as const } : item))
}

export function useFontPicker(options: UseFontPickerOptions) {
  const [families, setFamilies] = useState<{ family: string; source: 'local' | 'web' | 'system' }[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [accessState, setAccessState] = useState<FontAccessState>(
    options.localFontAccess?.state() ?? 'granted'
  )

  const filtered = useMemo(() => {
    if (!searchTerm) return families
    const lower = searchTerm.toLowerCase()
    return families.filter((option) => option.family.toLowerCase().includes(lower))
  }, [families, searchTerm])

  const loadFamilies = useCallback(async () => {
    if (families.length > 0 || loading) return
    setLoading(true)
    try {
      const result = await options.listFamilies()
      setFamilies(normalizeOptions(result))
      if (options.localFontAccess) {
        setAccessState(options.localFontAccess.state())
      }
    } finally {
      setLoading(false)
    }
  }, [families.length, loading, options])

  const requestAccess = useCallback(async () => {
    if (!options.localFontAccess || loading) return
    setLoading(true)
    try {
      const result = await options.localFontAccess.load()
      setFamilies(normalizeOptions(result))
      setAccessState(options.localFontAccess.state())
    } finally {
      setLoading(false)
    }
  }, [loading, options.localFontAccess])

  useEffect(() => {
    if (!open) return
    setSearchTerm('')
    if (options.localFontAccess) {
      setAccessState(options.localFontAccess.state())
    }
    
    if (accessState === 'prompt') {
      requestAccess()
    } else {
      loadFamilies()
    }
  }, [open, accessState, requestAccess, loadFamilies, options.localFontAccess])

  const select = useCallback((family: string) => {
    options.onUpdateModelValue?.(family)
    options.onSelect?.(family)
    setOpen(false)
  }, [options])

  return {
    families,
    searchTerm,
    open,
    filtered,
    loading,
    accessState,
    setSearchTerm,
    setOpen,
    requestAccess,
    select
  }
}

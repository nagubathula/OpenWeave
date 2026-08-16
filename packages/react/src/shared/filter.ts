/**
 * Locale-aware, case/diacritic-insensitive substring matching, replacing
 * reka-ui's `useFilter({ sensitivity: 'base' })` in the React SDK.
 */
export interface BaseFilter {
  contains: (text: string, term: string) => boolean
}

export function createBaseFilter(locale?: string): BaseFilter {
  const collator = new Intl.Collator(locale, { usage: 'search', sensitivity: 'base' })

  function contains(text: string, term: string): boolean {
    if (!term) return true
    const haystack = text ?? ''
    const needle = term.length
    if (needle > haystack.length) return false
    for (let i = 0; i + needle <= haystack.length; i++) {
      if (collator.compare(haystack.slice(i, i + needle), term) === 0) return true
    }
    return false
  }

  return { contains }
}

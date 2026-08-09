export type FontFamilyOption = { family: string; source: 'local' | 'web' | 'system' }

export interface FontPickerUI {
  trigger?: string
  content?: string
  item?: string
  itemMeta?: string
  search?: string
  viewport?: string
  empty?: string
  emptyAction?: string
}

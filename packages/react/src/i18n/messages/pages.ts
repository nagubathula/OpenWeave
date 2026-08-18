import { i18n } from '#react/i18n/create'
import { params } from '@nanostores/i18n'

export const pageMessageDefaults = {
  newPage: 'New page',
  rename: 'Rename',
  delete: 'Delete',
  pageName: params('Page {number}')
} as const

export const pageMessages = i18n('pages', pageMessageDefaults)

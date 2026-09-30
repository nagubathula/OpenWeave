import { useStore } from '@nanostores/react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import React, { useState } from 'react'

import { closeTab, getTabById, pendingCloseTabAtom } from '@/app/tabs'
import { AppAlertDialogRoot } from '@/components/ui/dialog'

export function CloseTabConfirmDialog() {
  const pending = useStore(pendingCloseTabAtom)
  const [saving, setSaving] = useState(false)

  if (!pending) return null

  const handleSaveAndClose = async () => {
    setSaving(true)
    try {
      const tab = getTabById(pending.tabId)
      if (tab) {
        await tab.store.saveFigFile()
      }
      closeTab(pending.tabId, { force: true })
      pendingCloseTabAtom.set(null)
    } catch (err) {
      console.error('Failed to save before closing tab:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDiscardAndClose = () => {
    closeTab(pending.tabId, { force: true })
    pendingCloseTabAtom.set(null)
  }

  const handleCancel = () => {
    pendingCloseTabAtom.set(null)
  }

  return (
    <AppAlertDialogRoot
      open={Boolean(pending)}
      ui={{
        overlay: 'z-50',
        content: 'w-96 rounded-xl p-5 shadow-2xl border border-border bg-panel text-surface'
      }}
      data-test-id="close-tab-confirm-dialog"
      onEscapeKeyDown={handleCancel}
    >
      <AlertDialogPrimitive.Title className="text-sm font-semibold text-surface">
        Unsaved Changes
      </AlertDialogPrimitive.Title>

      <AlertDialogPrimitive.Description className="mt-2 text-xs text-muted leading-relaxed">
        Do you want to save the changes made to{' '}
        <span className="font-semibold text-surface">{pending.name || 'Untitled'}</span> before
        closing? Your changes will be lost if you don't save them.
      </AlertDialogPrimitive.Description>

      <div className="mt-5 flex items-center justify-end gap-2">
        <AlertDialogPrimitive.Cancel
          type="button"
          data-test-id="close-tab-cancel"
          onClick={handleCancel}
          disabled={saving}
          className="cursor-pointer rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-surface hover:bg-hover transition-colors outline-none"
        >
          Cancel
        </AlertDialogPrimitive.Cancel>

        <button
          type="button"
          data-test-id="close-tab-discard"
          onClick={handleDiscardAndClose}
          disabled={saving}
          className="cursor-pointer rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors outline-none"
        >
          Don't Save
        </button>

        <AlertDialogPrimitive.Action
          type="button"
          data-test-id="close-tab-save"
          onClick={handleSaveAndClose}
          disabled={saving}
          className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 transition-colors outline-none"
        >
          {saving ? 'Saving...' : 'Save & Close'}
        </AlertDialogPrimitive.Action>
      </div>
    </AppAlertDialogRoot>
  )
}

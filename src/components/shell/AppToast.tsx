import * as ToastPrimitive from '@radix-ui/react-toast'
import { Check, TriangleAlert, Copy, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { toast as toastManager } from '@/app/shell/ui'
import Tip from '@/components/ui/Tip'
import { useToastUI } from '@/components/ui/toast'
import type { ToastVariant } from '@/components/ui/toast'

export default function AppToast() {
  const [toasts, setToasts] = useState<any[]>([])
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const defaultToastClass = useToastUI({ tone: 'default' }).base
  const warningToastClass = useToastUI({ tone: 'warning' }).base
  const errorToastClass = useToastUI({ tone: 'error' }).base

  useEffect(() => {
    const unsubscribe = toastManager.subscribe((newToasts) => {
      setToasts(newToasts)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const toastClass = (tone: ToastVariant) => {
    if (tone === 'error') return errorToastClass
    if (tone === 'warning') return warningToastClass
    return defaultToastClass
  }

  const handleCopy = async (id: number, message: string) => {
    try {
      await navigator.clipboard.writeText(message)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <ToastPrimitive.Provider swipeDirection="up">
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          duration={
            t.variant === 'error' ? toastManager.ERROR_TOAST_DURATION : toastManager.TOAST_DURATION
          }
          className={toastClass(t.variant)}
          onOpenChange={(open) => {
            if (!open) toastManager.remove(t.id)
          }}
          data-test-id="toast-item"
        >
          {t.variant === 'default' ? (
            <Check className="mt-0.5 size-3 shrink-0" />
          ) : (
            <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          )}

          <ToastPrimitive.Description className="min-w-0 flex-1 select-text">
            {t.message}
            {t.count > 1 && <span className="ml-1.5 opacity-70">×{t.count}</span>}
          </ToastPrimitive.Description>

          {t.variant !== 'default' && (
            <Tip label={copiedId === t.id ? 'Copied!' : 'Copy to clipboard'}>
              <button
                type="button"
                data-test-id="toast-copy-message"
                className="mt-0.5 shrink-0 cursor-pointer rounded p-0.5 opacity-70 hover:opacity-100"
                onClick={() => handleCopy(t.id, t.message)}
              >
                {copiedId === t.id ? <Check className="size-3" /> : <Copy className="size-3" />}
              </button>
            </Tip>
          )}

          {t.variant !== 'default' && (
            <ToastPrimitive.Close
              data-test-id="toast-close"
              className="mt-0.5 shrink-0 cursor-pointer rounded p-0.5 opacity-70 hover:opacity-100"
            >
              <X className="size-3" />
            </ToastPrimitive.Close>
          )}
        </ToastPrimitive.Root>
      ))}

      <ToastPrimitive.Viewport className="fixed top-2 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-1.5" />
    </ToastPrimitive.Provider>
  )
}

import { useEditorStore } from '@/app/editor/active-store'
import { ACTION_TOAST_DURATION } from '@/constants'

// One shared timer: the action toast is a single global field on editor state,
// so a new toast from any caller supersedes the pending hide.
let hideTimer: ReturnType<typeof setTimeout> | null = null

export function useActionToast() {
  const store = useEditorStore()

  function showActionToast(label: string) {
    store.state.actionToast = label
    if (hideTimer !== null) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      hideTimer = null
      store.state.actionToast = null
    }, ACTION_TOAST_DURATION)
  }

  return {
    showActionToast
  }
}

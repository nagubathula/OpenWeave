import { useEffect, useRef } from 'react'

export function useSpaceHeld() {
  const spaceHeld = useRef(false)
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code === 'Space') spaceHeld.current = true
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code === 'Space') spaceHeld.current = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])
  return spaceHeld
}

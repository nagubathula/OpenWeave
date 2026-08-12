// Ambient types for `tinykeys`. Its package.json `exports` has no `types`
// condition, so under moduleResolution "bundler" TypeScript can't locate the
// bundled .d.ts. We used to point a tsconfig `paths` entry at that .d.ts, but
// tsconfig paths also drive Turbopack's runtime resolution — sending the import
// to a types-only file and making `tinykeys` undefined at runtime. Declaring the
// module here fixes the types while leaving runtime resolution to package exports.
declare module 'tinykeys' {
  export type KeyBindingPress = [mods: string[], key: string | RegExp]

  export interface KeyBindingMap {
    [keybinding: string]: (event: KeyboardEvent) => void
  }

  export interface KeyBindingHandlerOptions {
    timeout?: number
  }

  export interface KeyBindingOptions extends KeyBindingHandlerOptions {
    event?: 'keydown' | 'keyup'
    capture?: boolean
  }

  export function parseKeybinding(str: string): KeyBindingPress[]
  export function matchKeyBindingPress(
    event: KeyboardEvent,
    press: KeyBindingPress
  ): boolean
  export function createKeybindingsHandler(
    keyBindingMap: KeyBindingMap,
    options?: KeyBindingHandlerOptions
  ): EventListener
  export function tinykeys(
    target: Window | HTMLElement,
    keyBindingMap: KeyBindingMap,
    options?: KeyBindingOptions
  ): () => void
}

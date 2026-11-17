/**
 * Document tab strip. In the browser it appears once two documents are open;
 * in the desktop app it is always shown and doubles as the window title bar
 * (Figma-style): a fixed dark surface the window can be dragged by, with the
 * native window controls drawn over its right edge (or traffic lights on the
 * left on macOS).
 */
const tabBarTheme = {
  slots: {
    root: 'scrollbar-none flex shrink-0 select-none',
    list: 'flex h-full min-w-0 items-end',
    home: 'flex h-full shrink-0 cursor-pointer items-center gap-1.5 outline-none transition-colors focus-visible:ring-1 focus-visible:ring-accent',
    homeIcon: 'size-3.5 shrink-0',
    homeLabel: '',
    trigger:
      'group/tab flex h-full max-w-48 min-w-0 cursor-pointer items-center gap-1.5 px-3 text-[11px] transition-colors outline-none select-none focus-visible:ring-1 focus-visible:ring-accent',
    icon: 'size-3 shrink-0 opacity-50',
    label: 'min-w-0 flex-1 truncate',
    close:
      'flex size-4 shrink-0 cursor-pointer items-center justify-center rounded transition-opacity group-hover/tab:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-panel-focus',
    closeIcon: 'size-3',
    newAction:
      'flex shrink-0 cursor-pointer items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-panel-focus',
    newIcon: 'size-3.5',
    dragSpace: 'h-full min-w-6 flex-1'
  },
  variants: {
    chrome: {
      browser: {
        root: 'h-9 items-end overflow-x-auto border-b border-border bg-canvas',
        home: 'border-r border-border px-3 text-[11px] font-medium',
        trigger: 'border-r border-border',
        close: 'hover:bg-hover',
        newAction: 'size-9 text-muted hover:text-surface',
        dragSpace: 'hidden'
      },
      desktop: {
        // Window drag region; every control opts out with `no-drag`.
        root: 'h-10 items-center gap-1 bg-[#2c2c2c] px-1.5 text-white [-webkit-app-region:drag]',
        list: 'items-center gap-1',
        home: 'size-7 justify-center rounded-md [-webkit-app-region:no-drag]',
        homeLabel: 'sr-only',
        trigger: 'h-7 rounded-md [-webkit-app-region:no-drag]',
        close: 'hover:bg-white/10',
        newAction:
          'size-7 rounded-md text-white/60 hover:bg-white/10 hover:text-white [-webkit-app-region:no-drag]'
      }
    },
    platform: {
      darwin: {},
      other: {}
    },
    active: {
      true: { close: 'opacity-100' },
      false: { close: 'opacity-0' }
    },
    homeActive: {
      true: {},
      false: {}
    }
  },
  compoundVariants: [
    // Room for the traffic lights on macOS, and for the native window
    // controls overlay (Window Controls Overlay env vars) elsewhere.
    { chrome: 'desktop' as const, platform: 'darwin' as const, class: { root: 'pl-20' } },
    {
      chrome: 'desktop' as const,
      platform: 'other' as const,
      class: {
        root: 'pr-[calc(100vw-env(titlebar-area-x,0px)-env(titlebar-area-width,100vw))]'
      }
    },
    { chrome: 'browser' as const, active: true, class: { trigger: 'bg-panel text-surface' } },
    {
      chrome: 'browser' as const,
      active: false,
      class: { trigger: 'text-muted hover:text-surface' }
    },
    { chrome: 'browser' as const, homeActive: true, class: { home: 'bg-panel text-surface' } },
    {
      chrome: 'browser' as const,
      homeActive: false,
      class: { home: 'text-muted hover:bg-hover/50 hover:text-surface' }
    },
    { chrome: 'desktop' as const, active: true, class: { trigger: 'bg-white/12 text-white' } },
    {
      chrome: 'desktop' as const,
      active: false,
      class: { trigger: 'text-white/60 hover:bg-white/6 hover:text-white' }
    },
    { chrome: 'desktop' as const, homeActive: true, class: { home: 'bg-white/12 text-white' } },
    {
      chrome: 'desktop' as const,
      homeActive: false,
      class: { home: 'text-white/60 hover:bg-white/6 hover:text-white' }
    }
  ],
  defaultVariants: {
    chrome: 'browser' as const,
    platform: 'other' as const,
    active: false,
    homeActive: false
  }
}

export type TabBarTheme = typeof tabBarTheme
export default tabBarTheme

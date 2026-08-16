const toolbarTheme = {
  slots: {
    button:
      'flex size-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-[#cecece] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-accent',
    icon: 'size-[18px]',
    flyoutGroup: 'flex items-center rounded-md',
    flyoutTrigger:
      'flex h-8 w-4 cursor-pointer items-center justify-center border-none bg-transparent p-0 text-[#9a9a9a] outline-none data-[state=open]:text-white focus-visible:ring-1 focus-visible:ring-accent',
    flyoutTriggerIcon: 'size-3',
    flyoutContent: '',
    flyoutItem: '',
    flyoutItemIndicator: 'flex size-3.5 shrink-0 items-center justify-center',
    flyoutItemIcon: 'size-3.5',
    flyoutItemLabel: 'flex-1',
    navigationAction:
      'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-panel text-muted shadow-sm outline-none select-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none',
    navigationIcon: 'size-3.5',
    action:
      'flex size-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-[#cecece] transition-colors outline-none select-none active:bg-white/15 focus-visible:ring-1 focus-visible:ring-accent',
    actionIcon: 'size-[18px]'
  },
  variants: {
    active: {
      true: {
        button: 'bg-accent text-white'
      },
      false: {}
    },
    mobile: {
      true: {
        button: 'rounded-md select-none'
      },
      false: {
        button: ''
      }
    },
    disabled: {
      true: {
        navigationAction: 'pointer-events-none'
      },
      false: {}
    }
  },
  compoundVariants: [
    {
      active: false,
      mobile: true,
      class: {
        button: 'active:bg-white/15'
      }
    },
    {
      active: false,
      mobile: false,
      class: {
        button: 'hover:bg-white/10 hover:text-white'
      }
    }
  ],
  defaultVariants: {
    active: false,
    mobile: false,
    disabled: false
  }
}

export type ToolbarTheme = typeof toolbarTheme
export default toolbarTheme

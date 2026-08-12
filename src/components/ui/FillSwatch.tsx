import React, { forwardRef } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { tv } from 'tailwind-variants'
import { FillSwatch as FillSwatchPrimitive } from '@openweave/react'
import type { Fill } from '@openweave/scene-graph'

import fillSwatchTheme from '@/theme/fill-swatch'
import type { ComponentUI } from '@/components/ui/types'

const styles = tv(fillSwatchTheme)()

export type FillSwatchUI = ComponentUI<typeof fillSwatchTheme>

export interface FillSwatchProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'children'> {
  fill: Fill
  label?: string
  ui?: FillSwatchUI
  children?: ReactNode | ((props: { background?: string }) => ReactNode)
}

export const FillSwatch = forwardRef<HTMLButtonElement, FillSwatchProps>(
  ({ fill, label, ui, className, children, ...props }, ref) => {
    return (
      <FillSwatchPrimitive
        ref={ref}
        fill={fill}
        label={label}
        className={styles.root({ className: [ui?.root, className] })}
        {...props}
      >
        {(swatchProps: unknown) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const props = swatchProps as any
          if (typeof children === 'function') {
            return children(props)
          }
          if (children) {
            return children
          }
          return (
            <span
              className={styles.preview({ className: ui?.preview })}
              style={{ background: props.background }}
            />
          )
        }}
      </FillSwatchPrimitive>
    )
  }
)
FillSwatch.displayName = 'FillSwatch'

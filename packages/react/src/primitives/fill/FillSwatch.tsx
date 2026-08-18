import { useBindingProvider } from '#react/controls/binding-provider'
import { Slot } from '@radix-ui/react-slot'
import React, { useMemo, forwardRef } from 'react'

import type { FillSwatchProps } from './types'
import { useFill } from './useFill'

const noop = () => undefined

export const FillSwatch = forwardRef<HTMLElement, FillSwatchProps>(
  ({ fill, label, as: Component = 'button', asChild = false, children, ...props }, ref) => {
    const provider = useBindingProvider()
    const { category, swatchBackground, transparent } = useFill(fill, noop)

    const boundVariables = (fill as unknown as { boundVariables?: { color?: { id: string } } })
      .boundVariables
    const variableId = fill.type === 'SOLID' ? boundVariables?.color?.id : undefined
    const boundVar = variableId && provider ? provider.resolve(variableId) : undefined

    const state = useMemo(() => {
      const bindingState = boundVar ? 'bound' : 'unbound'
      return {
        bindingState,
        stateAttrs: {
          'data-bound': boundVar ? ('' as const) : undefined,
          'data-binding-state': bindingState,
          'data-policy': 'detach-on-edit' as const
        }
      }
    }, [boundVar])

    const Comp = asChild ? Slot : Component

    const renderedChildren =
      typeof children === 'function'
        ? children({
            fill,
            color: fill.color,
            category,
            background: swatchBackground,
            transparent,
            bindingState: state.bindingState as any,
            stateAttrs: state.stateAttrs
          })
        : children

    return (
      <Comp
        ref={ref}
        aria-label={label ?? 'Color swatch'}
        title={label}
        {...state.stateAttrs}
        {...props}
      >
        {renderedChildren}
      </Comp>
    )
  }
)
FillSwatch.displayName = 'FillSwatch'

export default FillSwatch

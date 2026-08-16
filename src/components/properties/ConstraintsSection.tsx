import React from 'react'
import { tv } from 'tailwind-variants'
import { ConstraintsControlRoot, MIXED, constraintPins, useI18n } from '@openweave/react'
import type { ConstraintAxis, ConstraintEdge } from '@openweave/react'
import type { ConstraintType } from '@openweave/scene-graph'

import Tip from '@/components/ui/Tip'
import { AppSelect } from '@/components/ui/AppSelect'
import { PanelFieldGroup, PanelSection } from '@/components/ui/panel'
import constraintsTheme from '@/theme/constraints'

type PinPosition = keyof (typeof constraintsTheme)['variants']['pinPosition']
type ConstraintSelectValue = ConstraintType | 'MIXED'
type SelectOption = { value: ConstraintSelectValue; label: string }

type PinItem = {
  axis: ConstraintAxis
  edge: ConstraintEdge | 'center'
  position: PinPosition
  label: string
  active: boolean
}

const constraintStyles = tv(constraintsTheme)
const baseStyles = constraintStyles()

function optionsWithMixed(options: SelectOption[], mixed: boolean, mixedLabel: string): SelectOption[] {
  return mixed ? [{ value: 'MIXED', label: mixedLabel }, ...options] : options
}

export function ConstraintsSection() {
  const { panels } = useI18n()

  const horizontalOptions: SelectOption[] = [
    { value: 'MIN', label: panels.constraintLeft },
    { value: 'CENTER', label: panels.constraintCenter },
    { value: 'MAX', label: panels.constraintRight },
    { value: 'STRETCH', label: panels.constraintLeftAndRight },
    { value: 'SCALE', label: panels.constraintScale }
  ]
  const verticalOptions: SelectOption[] = [
    { value: 'MIN', label: panels.constraintTop },
    { value: 'CENTER', label: panels.constraintCenter },
    { value: 'MAX', label: panels.constraintBottom },
    { value: 'STRETCH', label: panels.constraintTopAndBottom },
    { value: 'SCALE', label: panels.constraintScale }
  ]

  return (
    <ConstraintsControlRoot>
      {({ active, horizontal, vertical, actions }) => {
        if (!active) return null

        const horizontalPins = constraintPins(horizontal)
        const verticalPins = constraintPins(vertical)
        const isScale = horizontal === 'SCALE' || vertical === 'SCALE'
        const diagramStyles = constraintStyles({ scale: isScale })

        const pins: PinItem[] = [
          {
            axis: 'horizontal',
            edge: 'leading',
            position: 'horizontalLeading',
            label: panels.constraintLeft,
            active: horizontalPins.leading
          },
          {
            axis: 'horizontal',
            edge: 'trailing',
            position: 'horizontalTrailing',
            label: panels.constraintRight,
            active: horizontalPins.trailing
          },
          {
            axis: 'vertical',
            edge: 'leading',
            position: 'verticalLeading',
            label: panels.constraintTop,
            active: verticalPins.leading
          },
          {
            axis: 'vertical',
            edge: 'trailing',
            position: 'verticalTrailing',
            label: panels.constraintBottom,
            active: verticalPins.trailing
          },
          {
            axis: 'horizontal',
            edge: 'center',
            position: 'horizontalCenter',
            label: panels.constraintHorizontalCenter,
            active: horizontalPins.center
          },
          {
            axis: 'vertical',
            edge: 'center',
            position: 'verticalCenter',
            label: panels.constraintVerticalCenter,
            active: verticalPins.center
          }
        ]

        return (
          <PanelSection label={panels.constraints}>
            <div className={baseStyles.root()}>
              <div
                role="group"
                aria-label={panels.constraints}
                data-slot="diagram"
                data-scale={isScale || undefined}
                className={diagramStyles.diagram()}
              >
                {pins.map((pin) => {
                  const pinStyles = constraintStyles({ active: pin.active, pinPosition: pin.position })
                  return (
                    <Tip key={pin.position} label={pin.label}>
                      <button
                        type="button"
                        data-slot="pin"
                        data-axis={pin.axis}
                        data-edge={pin.edge}
                        aria-label={pin.label}
                        aria-pressed={pin.active}
                        className={pinStyles.pin()}
                        onClick={(event) => {
                          const edge = pin.edge
                          if (edge === 'center') actions.setCenter(pin.axis)
                          else actions.togglePin(pin.axis, edge, event.shiftKey)
                        }}
                      >
                        <span className={pinStyles.pinMark()} />
                      </button>
                    </Tip>
                  )
                })}
                {(horizontalPins.scale || verticalPins.scale) && (
                  <span data-slot="scale-badge" className={diagramStyles.scaleBadge()}>
                    {panels.constraintScale}
                  </span>
                )}
              </div>

              <div className={baseStyles.selects()}>
                <PanelFieldGroup label={panels.horizontalConstraint}>
                  <AppSelect
                    value={horizontal === MIXED ? 'MIXED' : horizontal}
                    label={panels.horizontalConstraint}
                    options={optionsWithMixed(horizontalOptions, horizontal === MIXED, panels.mixed)}
                    onValueChange={(value: ConstraintSelectValue) => {
                      if (value !== 'MIXED') actions.setHorizontal(value)
                    }}
                  />
                </PanelFieldGroup>
                <PanelFieldGroup label={panels.verticalConstraint}>
                  <AppSelect
                    value={vertical === MIXED ? 'MIXED' : vertical}
                    label={panels.verticalConstraint}
                    options={optionsWithMixed(verticalOptions, vertical === MIXED, panels.mixed)}
                    onValueChange={(value: ConstraintSelectValue) => {
                      if (value !== 'MIXED') actions.setVertical(value)
                    }}
                  />
                </PanelFieldGroup>
              </div>
            </div>
          </PanelSection>
        )
      }}
    </ConstraintsControlRoot>
  )
}

export default ConstraintsSection

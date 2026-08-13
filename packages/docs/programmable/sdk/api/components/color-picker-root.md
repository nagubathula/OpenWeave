---
title: ColorPickerRoot
description: Headless popover-based color picker with interaction lifecycle events.
---

<script setup lang="ts">
import { data } from './color-picker-root.data'
</script>

# ColorPickerRoot

`ColorPickerRoot` composes a color swatch trigger with a popover surface while leaving the editor UI
to its slots. The trigger slot receives the current swatch style; the default slot receives the
current scene-graph color.

`openChange` reports the complete picker interaction boundary. `cancel` fires before an Escape
close, allowing BindableValue consumers to roll back a variable detach and paint update together.
Opening or focusing the picker does not emit a color update.

```tsx twoslash
import { useState } from 'react'
import type { Color } from '@openweave/scene-graph'
import { ColorPickerRoot } from '@openweave/react'

export function BrandColorPicker() {
  const [color, setColor] = useState<Color>({ r: 0.2, g: 0.5, b: 0.9, a: 1 })

  return (
    <ColorPickerRoot
      color={color}
      onUpdate={setColor}
      onOpenChange={(open) => console.log(open)}
      onCancel={() => console.log('cancel')}
      trigger={({ style }) => <button style={style} aria-label="Edit color" />}
    >
      {({ color: currentColor }) => (
        <output>
          {currentColor.r}, {currentColor.g}, {currentColor.b}
        </output>
      )}
    </ColorPickerRoot>
  )
}
```

## Generated API reference

<SdkComponentAPI :components="data.components" />

## Related APIs

- [ColorInputRoot](./color-input-root)
- [useColorModel](../hooks/use-color-model)
- [BindableValue](./bindable-value)

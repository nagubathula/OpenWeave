---
title: FillRoot
description: Headless fill category state and conversion actions.
---

<script setup lang="ts">
import { ColorFillDemo } from '#react/primitives/fill/demo/ColorFillDemo'
import { data } from './fill-root.data'
</script>

# FillRoot

`FillRoot` owns solid, gradient, and image category state without owning a popover or visual swatch.
Compose it around the picker surface appropriate for your application.

<ReactDemo :component="ColorFillDemo" />

Its default slot exposes the current fill, category, transparency, swatch background, and grouped
conversion actions. Category changes emit immutable `Fill` values and are no-ops when the requested
category is already active.

```tsx twoslash
import { useState } from 'react'
import type { Fill } from '@openweave/scene-graph'
import { FillRoot } from '@openweave/react'

export function FillCategorySwitch() {
  const [fill, setFill] = useState<Fill>({
    type: 'SOLID',
    color: { r: 0.2, g: 0.5, b: 0.9, a: 1 },
    opacity: 1,
    visible: true
  })

  return (
    <FillRoot fill={fill} onUpdate={setFill}>
      {(model) => <button onClick={model.actions.toGradient}>Gradient</button>}
    </FillRoot>
  )
}
```

## Generated API reference

<SdkComponentAPI :components="data.components" />

## Related APIs

- [FillSwatch](./fill-swatch)
- [ChannelSlider](./channel-slider)
- [useColorModel](../hooks/use-color-model)

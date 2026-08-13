---
title: FillSwatch
description: Binding-aware semantic preview for solid, gradient, and image fills.
---

<script setup lang="ts">
import { ColorFillDemo } from '#react/primitives/fill/demo/ColorFillDemo'
import { data } from './fill-swatch.data'
</script>

# FillSwatch

`FillSwatch` exposes a semantic preview for a fill without imposing application styling. Its slot
provides the effective fill, preview background, category, and transparency state. The root also
publishes `data-fill-type`, `data-fill-category`, and `data-transparent` for styling and tests.

When nested in `BindableValueRoot<Color>`, a bound solid fill previews the provider's resolved color
and forwards the binding state attributes. Reading or focusing a swatch never detaches the binding.
Consumers can place a checkerboard below the slot's `background` value for transparent paints.

```tsx twoslash
import type { Fill } from '@openweave/scene-graph'
import { FillSwatch } from '@openweave/react'

const fill: Fill = {
  type: 'SOLID',
  color: { r: 0.2, g: 0.5, b: 0.9, a: 0.5 },
  opacity: 1,
  visible: true
}

export function BrandSwatch() {
  return (
    <FillSwatch fill={fill} label="Brand fill">
      {(swatch) => <span style={{ background: swatch.background }} />}
    </FillSwatch>
  )
}
```

## Generated API reference

<SdkComponentAPI :components="data.components" />

## Related APIs

- [FillRoot](./fill-root)
- [BindableValue](./bindable-value)

---
title: PropertyGrid
description: Headless field-grid and action-rail anatomy for property panels.
---

<script setup lang="ts">
import { data } from './property-grid.data'
</script>

# PropertyGrid

`PropertyGridRoot` separates responsive property fields from optional intrinsic-width actions. It exposes structural data attributes without imposing column widths, gaps, or presentation.

```tsx twoslash
import { PropertyGridRoot } from '@openweave/react'

export function SizeFields() {
  return (
    <PropertyGridRoot
      columns={2}
      actions={
        <button type="button" aria-label="Constrain proportions">
          Link
        </button>
      }
    >
      <label>
        Width
        <input type="number" />
      </label>
      <label>
        Height
        <input type="number" />
      </label>
    </PropertyGridRoot>
  )
}
```

Themes can target `data-slot="fields"`, `data-slot="actions"`, `data-columns`, and `data-distribution`. The `wide-first` distribution is semantic; consumers choose its exact ratio.

## Generated API reference

<SdkComponentAPI :components="data.components" />

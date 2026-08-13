---
title: PropertySection
description: Headless collapsible anatomy for property-panel sections.
---

<script setup lang="ts">
import { PropertyPrimitivesDemo } from '#react/primitives/property-section/demo/PropertyPrimitivesDemo'
import { data } from './property-section.data'
</script>

# PropertySection

PropertySection supplies collapsible section anatomy and canonical open, empty, and disabled state
attributes without imposing presentation.

<ReactDemo :component="PropertyPrimitivesDemo" />

## Anatomy

- `PropertySectionRoot` — controlled or uncontrolled Collapsible state
- `PropertySectionHeader` — structural header container
- `PropertySectionTitle` — accessible Collapsible trigger
- `PropertySectionActions` — sibling action area, avoiding nested buttons
- `PropertySectionContent` — collapsible content region
- `PropertySectionEmptyAction` — empty-only action that opens before emitting `activate`

```tsx twoslash
import {
  PropertySectionContent,
  PropertySectionHeader,
  PropertySectionRoot,
  PropertySectionTitle
} from '@openweave/react'

export function LayoutSection() {
  return (
    <PropertySectionRoot defaultOpen>
      <PropertySectionHeader>
        <PropertySectionTitle>Layout</PropertySectionTitle>
      </PropertySectionHeader>
      <PropertySectionContent>Panel fields</PropertySectionContent>
    </PropertySectionRoot>
  )
}
```

## Generated API reference

<SdkComponentAPI :components="data.components" />

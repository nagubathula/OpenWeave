---
title: PropertyList
description: Precisely typed headless list anatomy for fills, strokes, and effects.
---

<script setup lang="ts">
import { data } from './property-list.data'
</script>

# PropertyList

PropertyList is a controlled, headless list primitive for fills, strokes, and effects. The
`propKey` discriminator gives slots and actions exact `Fill`, `Stroke`, or `Effect` types. Editor
mutation and undo behavior stay in `useEditorPropertyList()` or an application adapter.

## Anatomy

- `PropertyListRoot` — controlled items, identity, mixed state, and semantic events
- `PropertyListItem` — exact item type plus `data-hidden` and `data-dragging`
- `PropertyListAdd` — adds a typed item
- `PropertyListRemove` — removes an indexed item
- `PropertyListVisibility` — toggles indexed visibility and exposes `aria-pressed`

```tsx twoslash
import { useState } from 'react'
import type { Fill } from '@openweave/scene-graph'
import { PropertyListItem, PropertyListRemove, PropertyListRoot } from '@openweave/react'

export function FillList() {
  const [fills, setFills] = useState<Fill[]>([])

  return (
    <PropertyListRoot
      propKey="fills"
      items={fills}
      onRemove={(index) => setFills((current) => current.filter((_, i) => i !== index))}
    >
      {({ items }) =>
        items.map((_, index) => (
          <PropertyListItem key={index} propKey="fills" index={index}>
            {({ item }) => (
              <>
                <span>{item?.type}</span>
                <PropertyListRemove propKey="fills" index={index}>
                  Remove
                </PropertyListRemove>
              </>
            )}
          </PropertyListItem>
        ))
      }
    </PropertyListRoot>
  )
}
```

See the [PropertySection demo](./property-section) for the shared interactive state matrix.

## Editor adapter

OpenWeave panels use `useEditorPropertyList(propKey)` to connect controlled events to selection,
multi-node updates, undo batching, and reordering. Third-party SDK consumers can provide their own
state adapter without an OpenWeave editor context.

## Generated API reference

<SdkComponentAPI :components="data.components" />

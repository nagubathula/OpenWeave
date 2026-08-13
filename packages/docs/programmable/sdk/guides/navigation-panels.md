---
title: Navigation Panels
description: Build page and layer sidebars with PageListRoot, LayerTreeRoot, and selection state.
---

# Navigation Panels

OpenWeave sidebars usually combine two concerns:

- page navigation
- layer navigation

The Vue SDK provides headless primitives for both.

## Page navigation

Use `PageListRoot` or `usePageList()`.

```tsx
<PageListRoot>
  {({ pages, currentPageId, switchPage, addPage }) => (
    <div>
      {pages.map((page) => (
        <button key={page.id} onClick={() => switchPage(page.id)}>
          {page.name}
        </button>
      ))}
      <button onClick={() => addPage()}>New page</button>
    </div>
  )}
</PageListRoot>
```

## Layer navigation

Use `LayerTreeRoot` when you want SDK-managed tree structure but app-owned presentation.

```tsx
<LayerTreeRoot>
  {({ items, selectedIds, select, toggleExpand, getKey, getChildren }) => (
    <TreeView
      items={items}
      selectedIds={selectedIds}
      getKey={getKey}
      getChildren={getChildren}
      onSelect={select}
      onToggleExpand={toggleExpand}
    />
  )}
</LayerTreeRoot>
```

## Practical pattern

A common layout is:

- pages at the top of the sidebar
- layers below
- details or inline rename controls embedded in your row components

## Related APIs

- [usePageList](../api/hooks/use-page-list)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
- [useSelectionState](../api/hooks/use-selection-state)

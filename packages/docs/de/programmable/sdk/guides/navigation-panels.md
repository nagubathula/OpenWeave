---
title: Navigations-Panels
description: Seiten- und Ebenen-Seitenleisten mit PageListRoot, LayerTreeRoot und Auswahlzustand erstellen.
---

# Navigations-Panels

OpenWeave-Seitenleisten kombinieren gewöhnlich zwei Belange:

- Seitennavigation
- Ebenennavigation

Das Vue SDK stellt headless Primitive für beide bereit.

## Seitennavigation

Verwenden Sie `PageListRoot` oder `usePageList()`.

```tsx
<PageListRoot>
  {({ pages, currentPageId, switchPage, addPage }) => (
    <div>
      {pages.map((page) => (
        <button key={page.id} onClick={() => switchPage(page.id)}>
          {page.name}
        </button>
      ))}
      <button onClick={() => addPage()}>Neue Seite</button>
    </div>
  )}
</PageListRoot>
```

## Ebenennavigation

Verwenden Sie `LayerTreeRoot`, wenn Sie SDK-verwaltete Baumstruktur, aber app-eigene Darstellung möchten.

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

## Praktisches Muster

Ein gebräuchliches Layout ist:

- Seiten am oberen Rand der Seitenleiste
- Ebenen darunter
- Details oder Inline-Umbenennen-Steuerelemente in Ihren Zeilenkomponenten eingebettet

## Verwandte APIs

- [usePageList](../api/hooks/use-page-list)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
- [useSelectionState](../api/hooks/use-selection-state)

---
title: Panele nawigacyjne
description: Buduj paski boczne stron i warstw z PageListRoot, LayerTreeRoot i stanem selekcji.
---

# Panele nawigacyjne

Paski boczne OpenWeave zazwyczaj łączą dwa obszary:

- nawigację po stronach
- nawigację po warstwach

Vue SDK udostępnia bezstanowe prymitywy dla obu.

## Nawigacja po stronach

Użyj `PageListRoot` lub `usePageList()`.

```tsx
<PageListRoot>
  {({ pages, currentPageId, switchPage, addPage }) => (
    <div>
      {pages.map((page) => (
        <button key={page.id} onClick={() => switchPage(page.id)}>
          {page.name}
        </button>
      ))}
      <button onClick={() => addPage()}>Nowa strona</button>
    </div>
  )}
</PageListRoot>
```

## Nawigacja po warstwach

Użyj `LayerTreeRoot`, gdy chcesz strukturę drzewa zarządzaną przez SDK, ale prezentację należącą do aplikacji.

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

## Praktyczny wzorzec

Popularny layout to:

- strony u góry paska bocznego
- warstwy poniżej
- szczegóły lub kontrolki inline zmiany nazwy osadzone w komponentach wierszy

## Powiązane API

- [usePageList](../api/hooks/use-page-list)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
- [useSelectionState](../api/hooks/use-selection-state)

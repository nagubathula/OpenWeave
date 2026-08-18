---
title: Pannelli di Navigazione
description: Crea sidebar per pagine e layer con PageListRoot, LayerTreeRoot e lo stato della selezione.
---

# Pannelli di Navigazione

Le sidebar di OpenWeave di solito combinano due aspetti:

- navigazione tra pagine
- navigazione tra layer

Il React SDK fornisce primitive headless per entrambi.

## Navigazione tra pagine

Usa `PageListRoot` o `usePageList()`.

```tsx
<PageListRoot>
  {({ pages, currentPageId, switchPage, addPage }) => (
    <div>
      {pages.map((page) => (
        <button key={page.id} onClick={() => switchPage(page.id)}>
          {page.name}
        </button>
      ))}
      <button onClick={() => addPage()}>Nuova pagina</button>
    </div>
  )}
</PageListRoot>
```

## Navigazione tra layer

Usa `LayerTreeRoot` quando vuoi struttura ad albero gestita dall'SDK ma presentazione di proprietà dell'app.

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

## Pattern pratico

Un layout comune è:

- le pagine in cima alla sidebar
- i layer sotto
- controlli per dettagli o rinomina inline incorporati nei componenti di riga

## API correlate

- [usePageList](../api/hooks/use-page-list)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
- [useSelectionState](../api/hooks/use-selection-state)

---
title: Paneles de Navegación
description: Construye barras laterales de páginas y capas con PageListRoot, LayerTreeRoot y el estado de selección.
---

# Paneles de Navegación

Las barras laterales de OpenWeave suelen combinar dos preocupaciones:

- navegación de páginas
- navegación de capas

El SDK de Vue proporciona primitivos headless para ambas.

## Navegación de páginas

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
      <button onClick={() => addPage()}>Nueva página</button>
    </div>
  )}
</PageListRoot>
```

## Navegación de capas

Usa `LayerTreeRoot` cuando quieras estructura de árbol gestionada por el SDK pero presentación propia de la app.

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

## Patrón práctico

Un layout habitual es:

- páginas en la parte superior de la barra lateral
- capas debajo
- detalles o controles de renombrado inline integrados en los componentes de fila

## APIs relacionadas

- [usePageList](../api/hooks/use-page-list)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
- [useSelectionState](../api/hooks/use-selection-state)

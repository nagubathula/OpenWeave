---
title: Panneaux de navigation
description: Créez des barres latérales de pages et de calques avec PageListRoot, LayerTreeRoot et l'état de sélection.
---

# Panneaux de navigation

Les barres latérales OpenWeave combinent généralement deux préoccupations :

- la navigation entre pages
- la navigation entre calques

Le Vue SDK fournit des primitives headless pour les deux.

## Navigation entre pages

Utilisez `PageListRoot` ou `usePageList()`.

```tsx
<PageListRoot>
  {({ pages, currentPageId, switchPage, addPage }) => (
    <div>
      {pages.map((page) => (
        <button key={page.id} onClick={() => switchPage(page.id)}>
          {page.name}
        </button>
      ))}
      <button onClick={() => addPage()}>Nouvelle page</button>
    </div>
  )}
</PageListRoot>
```

## Navigation entre calques

Utilisez `LayerTreeRoot` quand vous voulez une structure d'arbre gérée par le SDK mais une présentation appartenant à l'application.

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

## Pattern pratique

Une mise en page courante est :

- les pages en haut de la barre latérale
- les calques en dessous
- les détails ou contrôles de renommage intégrés dans vos composants de ligne

## API associées

- [usePageList](../api/hooks/use-page-list)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
- [useSelectionState](../api/hooks/use-selection-state)

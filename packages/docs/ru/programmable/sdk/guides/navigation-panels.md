---
title: Навигационные панели
description: Создавайте боковые панели для страниц и слоёв с PageListRoot, LayerTreeRoot и состоянием выделения.
---

# Навигационные панели

Боковые панели OpenWeave обычно решают две задачи:

- навигация по страницам
- навигация по слоям

React SDK предоставляет headless-примитивы для обеих.

## Навигация по страницам

Используйте `PageListRoot` или `usePageList()`.

```tsx
<PageListRoot>
  {({ pages, currentPageId, switchPage, addPage }) => (
    <div>
      {pages.map((page) => (
        <button key={page.id} onClick={() => switchPage(page.id)}>
          {page.name}
        </button>
      ))}
      <button onClick={() => addPage()}>Новая страница</button>
    </div>
  )}
</PageListRoot>
```

## Навигация по слоям

Используйте `LayerTreeRoot`, когда хотите структуру дерева, управляемую SDK, но представление на стороне приложения.

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

## Практический паттерн

Распространённый макет:

- страницы вверху боковой панели
- слои ниже
- детали или элементы управления для переименования встроены в компоненты строк

## Связанные API

- [usePageList](../api/hooks/use-page-list)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
- [useSelectionState](../api/hooks/use-selection-state)

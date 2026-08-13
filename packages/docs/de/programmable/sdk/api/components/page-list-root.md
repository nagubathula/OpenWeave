---
title: PageListRoot
description: Headless strukturelles Primitiv für Seitenlisten-UIs.
---

# PageListRoot

`PageListRoot` ist ein headless strukturelles Primitiv für Seitenlisten-Interfaces.

Es bietet Slot-Props für:

- Seiten
- aktuelle Seiten-ID
- Trennlinien-Erkennung
- Seitenaktionen wie hinzufügen, wechseln, umbenennen und löschen

## Verwendung

Verwenden Sie es, wenn Sie SDK-bereitgestellte Seitenlisten-Struktur mit app-spezifischem Rendering und Styling möchten.

## Einfaches Beispiel

```tsx
<PageListRoot>
  {({ pages, currentPageId, switchPage }) => (
    <ul>
      {pages.map((page) => (
        <li key={page.id}>
          <button data-active={page.id === currentPageId} onClick={() => switchPage(page.id)}>
            {page.name}
          </button>
        </li>
      ))}
    </ul>
  )}
</PageListRoot>
```

## Verwandte APIs

- [usePageList](../hooks/use-page-list)

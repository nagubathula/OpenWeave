---
title: PageListRoot
description: Bezstanowy prymityw strukturalny dla UI listy stron.
---

# PageListRoot

`PageListRoot` to bezstanowy prymityw strukturalny dla interfejsów listy stron.

Udostępnia przez slot właściwości dla:

- stron
- id bieżącej strony
- wykrywania separatorów
- akcji stron jak dodawanie, przełączanie, zmiana nazwy i usuwanie

## Użycie

Użyj go, gdy chcesz strukturę listy stron dostarczaną przez SDK z renderowaniem i stylowaniem specyficznym dla aplikacji.

## Podstawowy przykład

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

## Powiązane API

- [usePageList](../hooks/use-page-list)

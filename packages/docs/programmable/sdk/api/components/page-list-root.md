---
title: PageListRoot
description: Headless structural primitive for page list UIs.
---

# PageListRoot

`PageListRoot` is a headless structural primitive for page list interfaces.

It provides slot props for:

- pages
- current page id
- divider detection
- page actions like add, switch, rename, and delete

## Usage

Use it when you want SDK-provided page-list structure with app-specific rendering and styling.

## Basic example

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

## Related APIs

- [usePageList](../hooks/use-page-list)

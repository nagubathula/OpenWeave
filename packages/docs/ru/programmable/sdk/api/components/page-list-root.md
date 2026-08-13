---
title: PageListRoot
description: Headless-структурный примитив для UI списка страниц.
---

# PageListRoot

`PageListRoot` — headless-структурный примитив для интерфейсов списка страниц.

Предоставляет пропы слота для:

- страниц
- id текущей страницы
- определения разделителей
- действий со страницами: добавить, переключить, переименовать, удалить

## Использование

Используйте его, когда нужна структура списка страниц от SDK с рендерингом и стилями на стороне приложения.

## Базовый пример

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

## Связанные API

- [usePageList](../hooks/use-page-list)

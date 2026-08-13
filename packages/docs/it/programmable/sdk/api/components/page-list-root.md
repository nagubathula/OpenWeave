---
title: PageListRoot
description: Primitiva strutturale headless per le UI della lista delle pagine.
---

# PageListRoot

`PageListRoot` è una primitiva strutturale headless per le interfacce della lista delle pagine.

Fornisce slot prop per:

- le pagine
- l'ID della pagina corrente
- il rilevamento dei divisori
- azioni sulle pagine come aggiunta, cambio, rinomina ed eliminazione

## Utilizzo

Usala quando vuoi struttura della lista delle pagine fornita dall'SDK con rendering e stile specifici dell'app.

## Esempio base

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

## API correlate

- [usePageList](../hooks/use-page-list)

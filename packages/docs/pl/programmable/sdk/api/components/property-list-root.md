---
title: PropertyListRoot
description: Bezstanowy prymityw strukturalny dla UI list wypełnień, obrysów i efektów.
---

# PropertyListRoot

`PropertyListRoot` to bezstanowy prymityw strukturalny dla edytorów właściwości opartych na tablicach.

Przeznaczony dla UI właściwości takich jak:

- wypełnienia
- obrysy
- efekty

Udostępnia przez slot właściwości dla:

- bieżących elementów
- wykrywania stanu mieszanego
- operacji dodawania/usuwania/aktualizacji/łatania
- przełączania widoczności per element

## Użycie

```tsx
<PropertyListRoot propKey="fills" items={fills} onAdd={addFill} onRemove={removeFill}>
  {({ items, actions }) => (
    <>
      {items.map((fill, index) => (
        <div key={index}>
          <button onClick={() => actions.remove(index)}>Usuń</button>
        </div>
      ))}
      <button onClick={() => actions.add(defaultFill)}>Dodaj wypełnienie</button>
    </>
  )}
</PropertyListRoot>
```

## Powiązane API

- [Przegląd API SDK](../)

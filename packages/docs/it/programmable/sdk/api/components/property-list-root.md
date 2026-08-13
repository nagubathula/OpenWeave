---
title: PropertyListRoot
description: Primitiva strutturale headless per UI di lista di riempimenti, tratti ed effetti.
---

# PropertyListRoot

`PropertyListRoot` è una primitiva strutturale headless per editor di proprietà basati su array.

È destinata a UI di proprietà come:

- riempimenti
- tratti
- effetti

Fornisce slot prop per:

- gli elementi correnti
- il rilevamento dello stato misto
- operazioni di aggiunta/rimozione/aggiornamento/patch
- attivazione/disattivazione della visibilità per elemento

## Utilizzo

```tsx
<PropertyListRoot propKey="fills" items={fills} onAdd={addFill} onRemove={removeFill}>
  {({ items, actions }) => (
    <>
      {items.map((fill, index) => (
        <div key={index}>
          <button onClick={() => actions.remove(index)}>Rimuovi</button>
        </div>
      ))}
      <button onClick={() => actions.add(defaultFill)}>Aggiungi riempimento</button>
    </>
  )}
</PropertyListRoot>
```

## API correlate

- [Panoramica API SDK](../)

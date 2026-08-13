---
title: PropertyListRoot
description: Headless strukturelles Primitiv für Füllungs-, Kontur- und Effekte-Listen-UIs.
---

# PropertyListRoot

`PropertyListRoot` ist ein headless strukturelles Primitiv für array-basierte Eigenschafts-Editoren.

Es ist gedacht für Eigenschafts-UIs wie:

- Füllungen
- Konturen
- Effekte

Es bietet Slot-Props für:

- aktuelle Elemente
- Mischzustands-Erkennung
- Hinzufügen/Entfernen/Aktualisieren/Patchen-Operationen
- Sichtbarkeitsumschalten pro Element

## Verwendung

```tsx
<PropertyListRoot propKey="fills" items={fills} onAdd={addFill} onRemove={removeFill}>
  {({ items, actions }) => (
    <>
      {items.map((fill, index) => (
        <div key={index}>
          <button onClick={() => actions.remove(index)}>Entfernen</button>
        </div>
      ))}
      <button onClick={() => actions.add(defaultFill)}>Füllung hinzufügen</button>
    </>
  )}
</PropertyListRoot>
```

## Verwandte APIs

- [SDK API-Übersicht](../)

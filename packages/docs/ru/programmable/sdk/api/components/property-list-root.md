---
title: PropertyListRoot
description: Headless-структурный примитив для UI списков заливок, обводок и эффектов.
---

# PropertyListRoot

`PropertyListRoot` — headless-структурный примитив для редакторов свойств на основе массивов.

Предназначен для UI свойств:

- заливок
- обводок
- эффектов

Предоставляет пропы слота для:

- текущих элементов
- определения смешанного состояния
- операций добавления/удаления/обновления/патча
- переключения видимости каждого элемента

## Использование

```tsx
<PropertyListRoot propKey="fills" items={fills} onAdd={addFill} onRemove={removeFill}>
  {({ items, actions }) => (
    <>
      {items.map((fill, index) => (
        <div key={index}>
          <button onClick={() => actions.remove(index)}>Удалить</button>
        </div>
      ))}
      <button onClick={() => actions.add(defaultFill)}>Добавить заливку</button>
    </>
  )}
</PropertyListRoot>
```

## Связанные API

- [Обзор SDK API](../)

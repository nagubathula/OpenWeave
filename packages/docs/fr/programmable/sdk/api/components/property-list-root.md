---
title: PropertyListRoot
description: Primitive structurelle headless pour les interfaces de liste de remplissages, contours et effets.
---

# PropertyListRoot

`PropertyListRoot` est une primitive structurelle headless pour les éditeurs de propriétés basés sur des tableaux.

Elle est destinée aux interfaces de propriétés comme :

- les remplissages
- les contours
- les effets

Elle fournit des props de slot pour :

- les éléments courants
- la détection d'état mixte
- les opérations d'ajout/suppression/mise à jour/correctif
- le basculement de visibilité par élément

## Utilisation

```tsx
<PropertyListRoot propKey="fills" items={fills} onAdd={addFill} onRemove={removeFill}>
  {({ items, actions }) => (
    <>
      {items.map((fill, index) => (
        <div key={index}>
          <button onClick={() => actions.remove(index)}>Supprimer</button>
        </div>
      ))}
      <button onClick={() => actions.add(defaultFill)}>Ajouter un remplissage</button>
    </>
  )}
</PropertyListRoot>
```

## API associées

- [Aperçu de l'API SDK](../)

---
title: useI18n
description: Lee los mensajes de UI localizados de OpenWeave y cambia el idioma activo del SDK.
---

# useI18n

`useI18n()` devuelve grupos de traducción reactivos más controles de idioma para los shells de editor potenciados por OpenWeave.

Úsalo cuando quieras etiquetas respaldadas por el SDK para menús, comandos, paneles, páginas y diálogos, o cuando necesites que los usuarios puedan cambiar de idioma.

## Uso

```ts
import { useI18n } from '@openweave/react'

const { menu, commands, panels, locale, availableLocales, localeLabels, setLocale } = useI18n()
```

## Devuelve

- `menu`
- `commands`
- `tools`
- `panels`
- `pages`
- `dialogs`
- `locale`
- `availableLocales`
- `localeLabels`
- `setLocale`

## Ejemplo básico

```tsx
import { useI18n } from '@openweave/react'

export function LocalePicker() {
  const { menu, locale, availableLocales, localeLabels, setLocale } = useI18n()

  return (
    <label className="flex items-center gap-2">
      <span>{menu.view}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
      >
        {availableLocales.map((code) => (
          <option key={code} value={code}>
            {localeLabels[code]}
          </option>
        ))}
      </select>
    </label>
  )
}
```

## Notas

- los cambios de idioma son reactivos en todos los grupos de mensajes del SDK
- el SDK también exporta primitivos de idioma de más bajo nivel cuando necesitas acceso directo al store

## APIs relacionadas

- [useMenuModel](./use-menu-model)
- [APIs de Idioma del SDK](../advanced/locale-apis)

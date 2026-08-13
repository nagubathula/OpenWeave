---
title: useI18n
description: Lokalisierte OpenWeave-UI-Nachrichten lesen und die aktive SDK-Locale wechseln.
---

# useI18n

`useI18n()` gibt reaktive Übersetzungsgruppen sowie Locale-Steuerelemente für OpenWeave-gestützte Editor-Shells zurück.

Verwenden Sie es, wenn Sie SDK-gestützte Beschriftungen für Menüs, Befehle, Panels, Seiten und Dialoge möchten, oder wenn Sie Benutzern ermöglichen möchten, Locales zu wechseln.

## Verwendung

```ts
import { useI18n } from '@openweave/react'

const { menu, commands, panels, locale, availableLocales, localeLabels, setLocale } = useI18n()
```

## Rückgabewerte

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

## Einfaches Beispiel

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

## Hinweise

- Locale-Wechsel sind über alle SDK-Nachrichtengruppen reaktiv
- das SDK exportiert auch Locale-Primitive auf niedrigerem Level, wenn Sie direkten Store-Zugriff benötigen

## Verwandte APIs

- [useMenuModel](./use-menu-model)
- [SDK Locale APIs](../advanced/locale-apis)

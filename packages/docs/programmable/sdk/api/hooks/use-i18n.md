---
title: useI18n
description: Read localized OpenWeave UI messages and switch the active SDK locale.
---

# useI18n

`useI18n()` returns reactive translation groups plus locale controls for OpenWeave-powered editor shells.

Use it when you want SDK-backed labels for menus, commands, panels, pages, and dialogs, or when you need to let users switch locales.

## Usage

```ts
import { useI18n } from '@openweave/react'

const { menu, commands, panels, locale, availableLocales, localeLabels, setLocale } = useI18n()
```

## Returns

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

## Basic example

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

## Notes

- locale changes are reactive across all SDK message groups
- the SDK also exports lower-level locale primitives when you need direct store access

## Related APIs

- [useMenuModel](./use-menu-model)
- [SDK Locale APIs](../advanced/locale-apis)

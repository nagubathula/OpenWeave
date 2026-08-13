---
title: useI18n
description: Odczytuj zlokalizowane komunikaty UI OpenWeave i przełączaj aktywny język SDK.
---

# useI18n

`useI18n()` zwraca reaktywne grupy tłumaczeń oraz kontrolki języka dla powłok edytora opartych na OpenWeave.

Użyj go, gdy chcesz etykiety wspierane przez SDK dla menu, poleceń, paneli, stron i okien dialogowych, lub gdy chcesz pozwolić użytkownikom na przełączanie języków.

## Użycie

```ts
import { useI18n } from '@openweave/react'

const { menu, commands, panels, locale, availableLocales, localeLabels, setLocale } = useI18n()
```

## Zwraca

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

## Podstawowy przykład

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

## Uwagi

- zmiany języka są reaktywne we wszystkich grupach komunikatów SDK
- SDK eksportuje również prymitywy języka niższego poziomu, gdy potrzebujesz bezpośredniego dostępu do store'a

## Powiązane API

- [useMenuModel](./use-menu-model)
- [API języka SDK](../advanced/locale-apis)

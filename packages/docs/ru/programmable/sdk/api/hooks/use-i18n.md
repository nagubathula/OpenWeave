---
title: useI18n
description: Чтение локализованных сообщений интерфейса OpenWeave и переключение активной локали SDK.
---

# useI18n

`useI18n()` возвращает реактивные группы переводов и элементы управления локалью для оболочек редактора на базе OpenWeave.

Используйте его, когда нужны метки меню, команд, панелей, страниц и диалогов, поддерживаемые SDK, или когда нужно позволить пользователям переключать локаль.

## Использование

```ts
import { useI18n } from '@openweave/react'

const { menu, commands, panels, locale, availableLocales, localeLabels, setLocale } = useI18n()
```

## Возвращает

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

## Базовый пример

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

## Примечания

- изменения локали реактивно распространяются на все группы сообщений SDK
- SDK также экспортирует низкоуровневые примитивы локали для прямого доступа к хранилищу

## Связанные API

- [useMenuModel](./use-menu-model)
- [Locale APIs SDK](../advanced/locale-apis)

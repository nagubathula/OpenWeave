---
title: Locale APIs
description: Locale-Stores und Metadaten auf niedrigerem Level, exportiert von @openweave/react.
---

# Locale APIs

Zusätzlich zu `useI18n()` exportiert das React SDK Locale-Primitive auf niedrigerem Level für erweiterte Integrationen:

- `locale`
- `localeSetting`
- `setLocale()`
- `AVAILABLE_LOCALES`
- `LOCALE_LABELS`

Verwenden Sie diese, wenn Sie direkten Store-Zugriff möchten, den Locale-Zustand mit einer größeren App-Shell integrieren möchten oder Locale-Metadaten ohne Abonnieren des vollständigen `useI18n()`-Rückgabeobjekts benötigen.

## Verwendung

```ts
import {
  locale,
  localeSetting,
  setLocale,
  AVAILABLE_LOCALES,
  LOCALE_LABELS,
} from '@openweave/react'
```

## Hinweise

- `locale` ist der aufgelöste aktive Locale-Store
- `localeSetting` ist der persistierte Benutzereinstellungs-Store
- `setLocale()` aktualisiert die Einstellung und die aktive Locale gemeinsam
- `AVAILABLE_LOCALES` und `LOCALE_LABELS` sind nützlich für benutzerdefinierte Picker

## Verwandte APIs

- [useI18n](../hooks/use-i18n)

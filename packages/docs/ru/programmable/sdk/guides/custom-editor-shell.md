---
title: Кастомная оболочка редактора
description: Создайте собственную оболочку редактора с provideEditor, CanvasRoot, меню, панелями и тулбарами.
---

# Кастомная оболочка редактора

Типичное React-приложение OpenWeave состоит из трёх слоёв:

1. `@openweave/core` создаёт редактор
2. `@openweave/react` адаптирует его в React-хуки и headless-примитивы
3. ваше приложение рендерит оболочку, стили и UX продукта

## Зачем это важно

Встроенное приложение OpenWeave — лишь одна возможная оболочка.

Вы можете создать совершенно другую — для узкого рабочего процесса: встроенный редактор внутри другого продукта, внутренний инструмент для работы с ассетами, редактор шаблонов, UI для аннотаций или поверхность для редактирования с ИИ-помощником и кастомными элементами управления.

Именно для этого и существует SDK.

## Рекомендуемая компоновка

Практичная оболочка обычно выглядит так:

- провайдер наверху с `provideEditor()`
- холст по центру
- навигация по страницам/слоям сбоку
- свойства с другой стороны
- меню и тулбары управляются компосаблами

## Пример

```tsx
import { createEditor } from '@openweave/core/editor'
import {
  EditorProvider,
  CanvasRoot,
  CanvasSurface,
  ToolbarRoot,
  PageListRoot
} from '@openweave/react'

const editor = createEditor({ width: 1440, height: 900 })

export function EditorShell() {
  return (
    <EditorProvider editor={editor}>
      <div className="grid h-screen grid-cols-[240px_1fr_320px] grid-rows-[48px_1fr]">
        <ToolbarRoot>
          {({ tools, activeTool, setTool }) => (
            <header className="col-span-3 flex items-center gap-2 border-b px-3">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  data-active={activeTool === tool.id}
                  onClick={() => setTool(tool.id)}
                >
                  {tool.label}
                </button>
              ))}
            </header>
          )}
        </ToolbarRoot>

        <aside className="border-r">
          <PageListRoot>
            {({ pages, currentPageId, switchPage }) => (
              <nav>
                {pages.map((page) => (
                  <button
                    key={page.id}
                    data-active={page.id === currentPageId}
                    onClick={() => switchPage(page.id)}
                  >
                    {page.name}
                  </button>
                ))}
              </nav>
            )}
          </PageListRoot>
        </aside>

        <main>
          <CanvasRoot>
            <CanvasSurface className="size-full" />
          </CanvasRoot>
        </main>

        <aside className="border-l">Панель свойств</aside>
      </div>
    </EditorProvider>
  )
}
```

## Почему такое разделение работает

- SDK отвечает за интеграцию с редактором и переиспользуемую headless-логику
- приложение отвечает за макет, стили и действия, специфичные для продукта
- компосаблы могут управлять меню и панелями без дополнительных компонентов-обёрток

## Связанные API

- [provideEditor](../api/hooks/provide-editor)
- [useCanvas](../api/hooks/use-canvas)
- [ToolbarRoot](../api/components/toolbar-root)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)

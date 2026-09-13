import {
  ArrowRight,
  Sparkles,
  Smartphone,
  Monitor,
  Component,
  Presentation,
  Film
} from 'lucide-react'
import React from 'react'

import { HOME_TEMPLATES, type HomeTemplate } from '@/app/home/templates'
import { openTemplateInTab } from '@/app/tabs'

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'figma-motion': Film,
  'mobile-app': Smartphone,
  'landing-page': Monitor,
  'design-system': Component,
  presentation: Presentation
}

interface TemplatesCarouselProps {
  onSelectTemplate?: (template: HomeTemplate) => void
}

export default function TemplatesCarousel({ onSelectTemplate }: TemplatesCarouselProps) {
  const handleSelect = (tpl: HomeTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(tpl)
    } else {
      openTemplateInTab(tpl)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-amber-400" />
          <h2 className="text-xs font-semibold text-surface">Starter Templates</h2>
          <span className="rounded-full bg-input/60 px-2 py-0.5 text-[10px] text-muted">
            Quick Start
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {HOME_TEMPLATES.map((tpl) => {
          const Icon = TEMPLATE_ICONS[tpl.id] ?? Sparkles
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleSelect(tpl)}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border/50 bg-panel/40 p-3.5 text-left transition-all hover:border-accent/60 hover:bg-panel hover:shadow-lg"
            >
              {/* Card visual preview banner */}
              <div
                className="relative mb-3 flex h-24 w-full items-center justify-center overflow-hidden rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${tpl.accentColor}22 0%, ${tpl.accentColor}08 100%)`,
                  border: `1px solid ${tpl.accentColor}33`
                }}
              >
                <div
                  className="flex size-10 items-center justify-center rounded-xl shadow-md transition-transform group-hover:scale-110"
                  style={{ backgroundColor: tpl.accentColor, color: '#ffffff' }}
                >
                  <Icon className="size-5" />
                </div>
                <span
                  className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-medium"
                  style={{ backgroundColor: `${tpl.accentColor}25`, color: tpl.accentColor }}
                >
                  {tpl.tag}
                </span>
              </div>

              {/* Title and details */}
              <div className="flex flex-1 flex-col">
                <span className="text-xs font-semibold text-surface transition-colors group-hover:text-accent">
                  {tpl.name}
                </span>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
                  {tpl.description}
                </p>
              </div>

              {/* Action footer */}
              <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                <span>Open template</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

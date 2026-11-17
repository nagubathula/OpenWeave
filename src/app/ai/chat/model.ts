import type { LanguageModel } from 'ai'

import { modelProviderAdapter } from '@/app/ai/providers/registry'
import type { ModelConfig } from '@/app/ai/providers/types'
import { isDesktop } from '@/app/desktop/env'
import { desktopFetch } from '@/app/desktop/http'

export type { ModelConfig } from '@/app/ai/providers/types'

export function resolveLanguageModelID(
  config: Pick<ModelConfig, 'providerID' | 'modelID' | 'customModelID'>
): string {
  if (
    config.providerID === 'openrouter' ||
    config.providerID === 'openai-compatible' ||
    config.providerID === 'anthropic-compatible'
  ) {
    return config.customModelID.trim() || config.modelID
  }
  return config.modelID
}

function modelFetch(): typeof fetch | undefined {
  return isDesktop() ? (desktopFetch as typeof fetch) : undefined
}

export function createLanguageModel(config: ModelConfig): LanguageModel {
  return modelProviderAdapter(config.providerID).create(config, { fetch: modelFetch() })
}

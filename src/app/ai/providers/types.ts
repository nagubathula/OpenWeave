import type { LanguageModel } from 'ai'

import type { AIProviderID } from '@openweave/core/constants'

export type ModelConfig = {
  providerID: AIProviderID
  apiKey: string
  modelID: string
  customModelID: string
  customBaseURL: string
  customAPIType: 'completions' | 'responses'
}

export type ModelProviderRuntime = {
  fetch?: typeof fetch
}

export interface ModelProviderAdapter {
  create(config: ModelConfig, runtime: ModelProviderRuntime): LanguageModel
}

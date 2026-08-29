import { atom } from 'nanostores'

import { IS_BROWSER } from '@openweave/core/constants'

import {
  apiKeyStatus,
  browserCredentialsRemembered,
  credentialsReady,
  customAPIType,
  customBaseURL,
  customModelID,
  isACPProvider,
  isConfigured,
  maxOutputTokens,
  modelID,
  pexelsKeyStatus,
  providerDef,
  providerID,
  registerAIChatEffects,
  resolveAPIKey,
  setAPIKey,
  setPexelsKey,
  setRememberCredentials,
  setUnsplashKey,
  unsplashKeyStatus
} from '@/app/ai/chat/storage'
import { createChatSessionManager } from '@/app/ai/chat/transports'
import { setDesignModelID } from '@/app/ai/models'
import { exposeChatTransportOverride } from '@/app/browser-bridge'
import { getActiveEditorStore } from '@/app/editor/active-store'

/**
 * Shared design/prototype/code/ai panel tab. A nanostores atom so React renders
 * it via `useStore` and non-React code (keyboard shortcuts) uses `.get()`/`.set()`.
 */
export type PropertiesTab = 'design' | 'prototype' | 'code' | 'ai'
const activeTab = atom<PropertiesTab>('design')

const chatSession = createChatSessionManager({
  isConfigured,
  isACPProvider,
  providerID,
  credentialsReady,
  getActiveEditorStore
})

registerAIChatEffects(chatSession.markTransportDirty)

if (IS_BROWSER) {
  exposeChatTransportOverride((factory) => {
    chatSession.setOverrideTransport(factory)
  })
}

export function useAIChat() {
  return {
    providerID,
    providerDef,
    apiKeyStatus,
    browserCredentialsRemembered,
    setAPIKey,
    resolveAPIKey,
    modelID,
    setModelID: setDesignModelID,
    customBaseURL,
    customModelID,
    customAPIType,
    maxOutputTokens,
    pexelsKeyStatus,
    setPexelsKey,
    setRememberCredentials,
    unsplashKeyStatus,
    setUnsplashKey,
    activeTab,
    isConfigured,
    ensureChat: chatSession.ensureChat,
    resetChat: chatSession.resetChat,
    getOverrideTransport: chatSession.getOverrideTransport
  }
}

<script setup lang="ts">
import { createElement, type ComponentType } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'

/**
 * Mounts a React component inside the Vue-rendered docs. The SDK is React while
 * VitePress renders Vue, so live examples cross the boundary here rather than in
 * each page.
 */
const { component, props } = defineProps<{
  component: ComponentType<Record<string, unknown>>
  props?: Record<string, unknown>
}>()

const host = useTemplateRef<HTMLDivElement>('host')
const root = shallowRef<Root>()

function render(): void {
  root.value?.render(createElement(component, props ?? {}))
}

onMounted(() => {
  if (!host.value) return
  root.value = createRoot(host.value)
  render()
})

watch(() => [component, props], render, { deep: true })

onBeforeUnmount(() => {
  // React must unmount before Vue detaches the host node, or createRoot warns.
  root.value?.unmount()
  root.value = undefined
})
</script>

<template>
  <div ref="host" class="not-prose my-6" />
</template>

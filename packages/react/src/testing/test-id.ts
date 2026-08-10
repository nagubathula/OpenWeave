export type TestId = string

export function testId(id?: TestId | null): { 'data-test-id'?: TestId } {
  return id ? { 'data-test-id': id } : {}
}

export function testIdSelector(id: TestId): string {
  return `[data-test-id="${cssEscape(id)}"]`
}

export function toolbarToolTestId(tool: string, mobile = false): TestId {
  // oxlint-disable-next-line openweave/no-generated-test-id-literals
  return `${mobile ? 'mobile-' : ''}toolbar-tool-${tool.toLowerCase()}`
}

export function toolbarFlyoutTestId(tool: string, mobile = false): TestId {
  // oxlint-disable-next-line openweave/no-generated-test-id-literals
  return `${mobile ? 'mobile-' : ''}toolbar-flyout-${tool.toLowerCase()}`
}

export function toolbarFlyoutItemTestId(tool: string, mobile = false): TestId {
  // oxlint-disable-next-line openweave/no-generated-test-id-literals
  return `${mobile ? 'mobile-' : ''}toolbar-flyout-item-${tool.toLowerCase()}`
}

export function variablesAddTestId(type: string): TestId {
  // oxlint-disable-next-line openweave/no-generated-test-id-literals
  return `variables-add-${type.toLowerCase()}`
}

export function acpPermissionOptionTestId(kind: string): TestId {
  // oxlint-disable-next-line openweave/no-generated-test-id-literals
  return `acp-permission-option-${kind}`
}

function cssEscape(value: string): string {
  return CSS.escape(value)
}

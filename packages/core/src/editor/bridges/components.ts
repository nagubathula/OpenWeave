import type { createComponentActions } from '#core/editor/components'
import type { createPageActions } from '#core/editor/pages'
import type { createSelectionActions } from '#core/editor/selection'
import type { createStructureActions } from '#core/editor/structure'

type ComponentActions = ReturnType<typeof createComponentActions>
type PageActions = ReturnType<typeof createPageActions>
type SelectionActions = ReturnType<typeof createSelectionActions>
type StructureActions = ReturnType<typeof createStructureActions>

export function createComponentBridge(
  components: ComponentActions,
  selection: SelectionActions,
  structure: StructureActions,
  pages: PageActions
) {
  return {
    createComponentFromSelection: () =>
      components.createComponentFromSelection(
        selection.getSelectedNodes(),
        structure.wrapSelectionInContainer
      ),
    createComponentSetFromComponents: () =>
      components.createComponentSetFromComponents(
        selection.getSelectedNodes(),
        structure.wrapSelectionInContainer
      ),
    createInstanceFromComponent: components.createInstanceFromComponent,
    detachInstance: () => components.detachInstance(selection.getSelectedNode()),
    resetInstanceOverrides: () => components.resetInstanceOverrides(selection.getSelectedNode()),
    swapInstance: (componentId: string) =>
      components.swapInstance(selection.getSelectedNode(), componentId),
    setPropertyDefinitionDefault: components.setPropertyDefinitionDefault,
    focusComponent: (componentId: string) =>
      components.focusComponent(componentId, pages.switchPage),
    goToMainComponent: () =>
      components.goToMainComponent(selection.getSelectedNode(), pages.switchPage),
    getComponentSetPropertyDefs: components.getComponentSetPropertyDefs,
    addPropertyDefinition: components.addPropertyDefinition,
    removePropertyDefinition: components.removePropertyDefinition,
    renamePropertyDefinition: components.renamePropertyDefinition,
    setPropertyDefinitionPreferredValues: components.setPropertyDefinitionPreferredValues,
    movePropertyDefinition: components.movePropertyDefinition,
    renameVariantValue: components.renameVariantValue,
    resolveVariantConflicts: components.resolveVariantConflicts,
    arrangeComponentSetVariants: components.arrangeComponentSetVariants,
    updateVariantMembership: components.updateVariantMembership,
    collectVariantOptions: components.collectVariantOptions,
    findVariantByValues: components.findVariantByValues,
    getDefaultVariantForComponentSet: components.getDefaultVariantForComponentSet,
    getComponentSetVariantConflicts: components.getComponentSetVariantConflicts,
    getComponentSetVariants: components.getComponentSetVariants,
    addVariantToSet: components.addVariantToSet,
    addVariant: (nodeId: string) =>
      components.addVariant(nodeId, structure.wrapSelectionInContainer),
    switchInstanceVariant: components.switchInstanceVariant,
    getInstanceComponentPropertyDefinitions: components.getInstanceComponentPropertyDefinitions,
    getInstanceComponentPropertyValue: components.getInstanceComponentPropertyValue,
    setInstanceComponentProperty: components.setInstanceComponentProperty,
    setVariantPropertyValue: components.setVariantPropertyValue,
    componentPropertyDefsForNode: components.componentPropertyDefsForNode,
    setComponentPropertyReference: components.setComponentPropertyReference
  }
}

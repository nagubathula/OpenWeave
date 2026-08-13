import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import type { Loader } from 'vitepress'

export interface SdkComponentPropMeta {
  name: string
  type: string
  description: string
  required: boolean
  default?: string
}

export interface SdkComponentEventMeta {
  name: string
  payload: string
  description: string
}

export interface SdkComponentSlotMeta {
  name: string
  props: string
  description: string
}

export interface SdkComponentExposeMeta {
  name: string
  type: string
  description: string
}

export interface SdkComponentMeta {
  name: string
  source: string
  props: SdkComponentPropMeta[]
  events: SdkComponentEventMeta[]
  slots: SdkComponentSlotMeta[]
  exposed: SdkComponentExposeMeta[]
}

function findWorkspaceRoot(start: string): string {
  let directory = start
  while (true) {
    const packagePath = join(directory, 'package.json')
    if (existsSync(packagePath)) {
      const packageJSON = JSON.parse(readFileSync(packagePath, 'utf8')) as { workspaces?: unknown }
      if (Array.isArray(packageJSON.workspaces)) return directory
    }
    const parent = dirname(directory)
    if (parent === directory) throw new Error('Unable to locate workspace root')
    directory = parent
  }
}

const repoRoot = findWorkspaceRoot(fileURLToPath(new URL('.', import.meta.url)))

/**
 * A single lazily-created program over the React SDK. Building the program is the
 * expensive part, so every component read shares it.
 */
let programCache: ts.Program | undefined

function getProgram(): ts.Program {
  if (programCache) return programCache

  const configPath = resolve(repoRoot, 'packages/react/tsconfig.json')
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'))
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    dirname(configPath)
  )

  programCache = ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options
  })
  return programCache
}

function isPascalCase(name: string): boolean {
  return /^[A-Z]/.test(name)
}

/**
 * Finds the exported component in a source file. SDK components are exported as
 * `export function <PascalCase>(props) { ... }`; the file's own basename wins when a
 * file exports more than one so that `NumberFieldRoot.tsx` documents `NumberFieldRoot`.
 */
function findComponentSymbol(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  preferredName: string
): ts.Symbol | undefined {
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile)
  if (!moduleSymbol) return undefined

  const exports = checker.getExportsOfModule(moduleSymbol)
  const components = exports.filter((symbol) => {
    if (!isPascalCase(symbol.getName())) return false
    const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0]
    if (!declaration) return false
    return (
      ts.isFunctionDeclaration(declaration) ||
      ts.isVariableDeclaration(declaration) ||
      ts.isFunctionExpression(declaration) ||
      ts.isArrowFunction(declaration)
    )
  })

  return components.find((symbol) => symbol.getName() === preferredName) ?? components[0]
}

function getPropsType(
  symbol: ts.Symbol,
  checker: ts.TypeChecker
): ts.Type | undefined {
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0]
  if (!declaration) return undefined

  const type = checker.getTypeOfSymbolAtLocation(symbol, declaration)
  const [signature] = type.getCallSignatures()
  if (!signature) return undefined

  const [parameter] = signature.getParameters()
  if (!parameter) return undefined

  const parameterDeclaration = parameter.valueDeclaration ?? parameter.declarations?.[0]
  if (!parameterDeclaration) return undefined

  return checker.getTypeOfSymbolAtLocation(parameter, parameterDeclaration)
}

/**
 * The React analogue of vue-component-meta's `global` flag. Components that spread
 * `ComponentPropsWithoutRef<'div'>` inherit every DOM attribute and handler from React's
 * ambient types; only members declared in the SDK's own sources are component API.
 */
function isOwnProperty(symbol: ts.Symbol): boolean {
  const declarations = symbol.getDeclarations()
  if (!declarations?.length) return false
  return declarations.some((declaration) => {
    const fileName = declaration.getSourceFile().fileName
    return !fileName.includes('/node_modules/') && !fileName.endsWith('.d.ts')
  })
}

function describe(symbol: ts.Symbol, checker: ts.TypeChecker): string {
  return ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim()
}

function typeToString(type: ts.Type, checker: ts.TypeChecker): string {
  return checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation)
}

function isOptional(symbol: ts.Symbol): boolean {
  return (symbol.getFlags() & ts.SymbolFlags.Optional) !== 0
}

/**
 * Reads the default from the component's destructured parameter, which is where React
 * components declare them (`function Root({ step = 1 })`).
 */
function readDefaults(symbol: ts.Symbol): Map<string, string> {
  const defaults = new Map<string, string>()
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0]
  if (!declaration) return defaults

  let fn: ts.SignatureDeclaration | undefined
  if (ts.isFunctionDeclaration(declaration)) fn = declaration
  else if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
    const initializer = declaration.initializer
    if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) fn = initializer
  }
  if (!fn) return defaults

  const [parameter] = fn.parameters
  if (!parameter || !ts.isObjectBindingPattern(parameter.name)) return defaults

  for (const element of parameter.name.elements) {
    if (!element.initializer) continue
    const propertyName = element.propertyName ?? element.name
    if (!ts.isIdentifier(propertyName)) continue
    defaults.set(propertyName.text, element.initializer.getText())
  }
  return defaults
}

/**
 * Optional props surface as `T | undefined`, and a union is never callable, so the
 * `undefined` arm has to come off before any call-signature check.
 */
function withoutUndefined(type: ts.Type): ts.Type {
  if (!type.isUnion()) return type
  const arms = type.types.filter(
    (arm) => (arm.getFlags() & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)) === 0
  )
  return arms.length === 1 ? arms[0] : type
}

/**
 * React has no separate emit channel: callback props (`onModelValueChange`) are the
 * event surface, so they are split out of props and reported as events with their
 * parameter list as the payload.
 */
function isEventProp(name: string, type: ts.Type): boolean {
  return /^on[A-Z]/.test(name) && withoutUndefined(type).getCallSignatures().length > 0
}

function eventPayload(type: ts.Type, checker: ts.TypeChecker): string {
  const [signature] = withoutUndefined(type).getCallSignatures()
  if (!signature) return '[]'
  const parameters = signature.getParameters().map((parameter) => {
    const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0]
    const parameterType = declaration
      ? checker.getTypeOfSymbolAtLocation(parameter, declaration)
      : undefined
    return `${parameter.getName()}: ${parameterType ? typeToString(parameterType, checker) : 'unknown'}`
  })
  return `[${parameters.join(', ')}]`
}

/**
 * A render-prop `children` is the React analogue of a Vue scoped slot. Only the
 * function arm of `ReactNode | ((props: X) => ReactNode)` carries slot props.
 */
function readSlot(
  type: ts.Type,
  checker: ts.TypeChecker,
  description: string
): SdkComponentSlotMeta | undefined {
  const arms = type.isUnion() ? type.types : [type]
  const renderProp = arms.find((arm) => arm.getCallSignatures().length > 0)
  if (!renderProp) return undefined

  const [signature] = renderProp.getCallSignatures()
  const [parameter] = signature.getParameters()
  if (!parameter) return { name: 'children', props: '{}', description }

  const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0]
  const parameterType = declaration
    ? checker.getTypeOfSymbolAtLocation(parameter, declaration)
    : undefined

  return {
    name: 'children',
    props: parameterType ? typeToString(parameterType, checker) : 'unknown',
    description
  }
}

export interface SdkComponentData {
  components: SdkComponentMeta[]
}

export function defineComponentMetaLoader(sources: string[]): Loader<SdkComponentData> {
  return {
    watch: sources.map((source) => resolve(repoRoot, source)),
    load: () => ({ components: sources.map(readComponentMeta) })
  }
}

export function readComponentMeta(source: string): SdkComponentMeta {
  const absoluteSource = resolve(repoRoot, source)
  const program = getProgram()
  const checker = program.getTypeChecker()

  const sourceFile = program.getSourceFile(absoluteSource)
  if (!sourceFile) {
    throw new Error(
      `${source} is not part of the React SDK program — check the path and packages/react/tsconfig.json includes.`
    )
  }

  const fallbackName = source.split('/').at(-1)?.replace(/\.tsx?$/, '') ?? source
  const component = findComponentSymbol(sourceFile, checker, fallbackName)
  if (!component) {
    throw new Error(`No exported React component found in ${source}.`)
  }

  const meta: SdkComponentMeta = {
    name: component.getName(),
    source,
    props: [],
    events: [],
    slots: [],
    exposed: []
  }

  const propsType = getPropsType(component, checker)
  if (!propsType) return meta

  const defaults = readDefaults(component)

  for (const property of propsType.getProperties()) {
    if (!isOwnProperty(property)) continue

    const name = property.getName()
    const declaration = property.valueDeclaration ?? property.declarations?.[0]
    if (!declaration) continue

    const type = checker.getTypeOfSymbolAtLocation(property, declaration)
    const description = describe(property, checker)

    if (name === 'children') {
      const slot = readSlot(type, checker, description)
      if (slot) meta.slots.push(slot)
      else {
        meta.props.push({
          name,
          type: typeToString(type, checker),
          description,
          required: !isOptional(property),
          default: defaults.get(name)
        })
      }
      continue
    }

    if (isEventProp(name, type)) {
      meta.events.push({ name, payload: eventPayload(type, checker), description })
      continue
    }

    meta.props.push({
      name,
      type: typeToString(type, checker),
      description,
      required: !isOptional(property),
      default: defaults.get(name)
    })
  }

  return meta
}

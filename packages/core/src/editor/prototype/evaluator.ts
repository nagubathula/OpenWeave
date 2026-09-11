import type { VariableValue } from '@openweave/scene-graph'

export class PrototypeEvaluator {
  constructor(
    private variables: Map<string, VariableValue>,
    private getVariableName: (id: string) => string | undefined
  ) {}

  evaluate(expression: string): VariableValue | undefined {
    if (!expression) return undefined

    try {
      let parsed = expression
      const keys: string[] = []
      const values: unknown[] = []

      // Map variables. We support `var:123` IDs or `#VariableName` (Figma syntax)
      let idx = 0
      for (const [id, value] of this.variables.entries()) {
        const varName = 'v' + idx++
        keys.push(varName)
        values.push(value)

        // Replace variable IDs
        parsed = parsed.replaceAll(id, varName)

        // Replace #VariableName
        const name = this.getVariableName(id)
        if (name) {
          parsed = parsed.replaceAll(`#${name}`, varName)
        }
      }

      // Normalize single `=` to `==` for equality checks if it's not part of `>=`, `<=`, `!=`, or `==`
      parsed = parsed.replace(/(?<![<>=!])=(?!=)/g, '==')

      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const func = new Function(...keys, 'return ' + parsed + ';')
      return func(...values) as VariableValue
    } catch (err) {
      console.error('Failed to evaluate prototype expression:', expression, err)
      return undefined
    }
  }
}

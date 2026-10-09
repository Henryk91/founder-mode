import { formatEuro } from './format'

/**
 * Fills scenario text placeholders: `{name}` is a plain number, `{name:eur}` is cents shown as
 * euros. A placeholder without a value stays visible, so a content mistake cannot go unnoticed.
 */
export function fillText(template: string, values: Record<string, number>): string {
  return template.replace(/\{(\w+)(?::(eur))?\}/g, (match, name: string, format?: string) => {
    const value = values[name]
    if (value === undefined) return match
    return format === 'eur' ? formatEuro(value) : String(value)
  })
}

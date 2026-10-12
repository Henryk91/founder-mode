import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { parse } from 'yaml'

/** The scenario's YAML text as JSON text: the same data, which `JSON.parse` reads as well. */
export function yamlToJson(text: string): string {
  return JSON.stringify(parse(text))
}

/**
 * Parses the content YAML at build time, so the phone downloads neither the YAML parser nor the
 * YAML. A `*.yaml?raw` import gives JSON text, and `yaml` in the bundle becomes `JSON.parse`
 * (src/yamlShim.ts). JSON is YAML, so the content package reads it unchanged, validates it with
 * the same schema, and gets equal scenarios (test/yamlAsJson.test.ts), so saves stay valid.
 */
export function yamlAsJson(shim: string): Plugin {
  return {
    name: 'founder-mode:yaml-as-json',
    enforce: 'pre',
    config: () => ({ resolve: { alias: [{ find: /^yaml$/, replacement: shim }] } }),
    load(id) {
      const [file, query] = id.split('?')
      if (!file?.endsWith('.yaml') || query !== 'raw') return null
      return `export default ${JSON.stringify(yamlToJson(readFileSync(file, 'utf8')))}`
    },
  }
}

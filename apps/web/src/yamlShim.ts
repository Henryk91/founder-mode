/**
 * Stands in for the `yaml` package in the web bundle. The build turns every content YAML file
 * into JSON (build/yamlAsJson.ts), so reading it needs nothing but `JSON.parse`.
 */
export function parse(text: string): unknown {
  return JSON.parse(text)
}

// Vite and Vitest import YAML files as plain text with the `?raw` suffix.
declare module '*.yaml?raw' {
  const text: string
  export default text
}

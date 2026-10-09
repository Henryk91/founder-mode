export type UiStage = 'scrappy' | 'organised'

type LabelEntry = string | Record<UiStage, string>

const labels = {
  'app.title': 'Founder Mode',
  'app.placeholder': 'Nothing to run yet. The engine arrives in Phase 1.',
  'app.engineVersion': 'Engine',
} satisfies Record<string, LabelEntry>

export type LabelKey = keyof typeof labels

export function label(key: LabelKey, stage: UiStage): string {
  const entry: LabelEntry = labels[key]
  return typeof entry === 'string' ? entry : entry[stage]
}

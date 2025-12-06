export type Model = {
  name: string
  value: string
}

export const models: Model[] = [
  {
    name: "Claude Haiku 4.5",
    value: "anthropic/claude-haiku-4.5",
  },
  {
    name: "Claude 4.5 Sonnet",
    value: "anthropic/claude-sonnet-4.5",
  },
]

export function getModel(model?: string): Model {
  if (!model) {
    return models[0] as Model
  }
  return models.find((m) => m.value === model) ?? (models[0] as Model)
}

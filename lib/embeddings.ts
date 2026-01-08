import { embed, embedMany } from "ai"
import { google } from "@ai-sdk/google"

const embeddingModel = google.textEmbeddingModel("text-embedding-004")

export const EMBEDDING_DIMENSIONS = 768

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  })
  return embedding
}

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return []

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
  })
  return embeddings
}

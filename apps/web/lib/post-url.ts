import slugify from "slugify"

const MAX_SLUG_LENGTH = 80
const POST_SEGMENT_REGEX = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*-)?(\d+)$/i

export function postSlug({
  number,
  title,
}: {
  number: number
  title: string | null | undefined
}): string {
  let slug = title ? slugify(title, { lower: true, strict: true }) : ""
  if (slug.length > MAX_SLUG_LENGTH) {
    const cut = slug.slice(0, MAX_SLUG_LENGTH)
    const lastDash = cut.lastIndexOf("-")
    slug = lastDash > 0 ? cut.slice(0, lastDash) : cut
  }
  return slug ? `${slug}-${number}` : String(number)
}

export function postPath({
  owner,
  repo,
  number,
  title,
}: {
  owner: string
  repo: string
  number: number
  title: string | null | undefined
}): string {
  return `/${owner}/${repo}/${postSlug({ number, title })}`
}

/**
 * Accepts both `123` and `some-title-123`, so old links keep working.
 * Returns null for anything else.
 */
export function parsePostSegment(segment: string): number | null {
  const match = POST_SEGMENT_REGEX.exec(segment)
  if (!match) {
    return null
  }
  const number = Number.parseInt(match[1], 10)
  return Number.isSafeInteger(number) && number > 0 ? number : null
}

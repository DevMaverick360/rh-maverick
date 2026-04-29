/** Gera slug estável para tags (único no catálogo). */
export function slugifyTag(input: string): string {
  const base = input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base.length > 0 ? base.slice(0, 120) : 'tag'
}

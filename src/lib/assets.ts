export function assetUrl(rel: string): string {
  // For files in /public, Vite serves them at `${import.meta.env.BASE_URL}${rel}`
  // Example: assetUrl('textures/hdr.hdr') -> '/threejs-visualizer-/textures/hdr.hdr' in prod
  const base = (import.meta as any).env?.BASE_URL ?? '/'
  if (!rel || rel.startsWith('http://') || rel.startsWith('https://')) return rel
  // normalize: strip any leading slash from rel to avoid '//' when joining
  const cleanRel = rel.replace(/^\/+/, '')
  return `${base}${cleanRel}`
}
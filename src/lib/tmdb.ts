export type Movie = {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string
  vote_average?: number
  genre_ids?: number[]
  media_type?: string
  original_language?: string
}
export type MoviePage = { page: number; results: Movie[]; total_pages: number; total_results: number }
export const IMG = 'https://image.tmdb.org/t/p/'
export const posterUrl = (path: string | null, size = 'w500') => path ? `${IMG}${size}${path}` : ''

const endpoint = import.meta.env.VITE_TMDB_FUNCTION_URL as string | undefined
export async function tmdb(action: string, params: Record<string, string | number | undefined> = {}): Promise<any> {
  if (!endpoint || endpoint.includes('YOUR_PROJECT')) throw new Error('Connect your TMDB Edge Function to load the live catalogue.')
  const url = new URL(endpoint)
  url.searchParams.set('action', action)
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') url.searchParams.set(k, String(v)) })
  const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `Catalogue request failed (${response.status}).`)
  return body
}

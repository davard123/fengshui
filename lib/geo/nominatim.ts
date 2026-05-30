/**
 * Nominatim (OpenStreetMap) — 免费地址转坐标，无需 API Key
 */

export type Coords = { lat: number; lon: number }

export async function geocodeAddress(address: string): Promise<Coords | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(address)}` +
      `&format=json&limit=1&countrycodes=us`

    const res = await fetch(url, {
      headers: { "User-Agent": "FengshuiApp/1.0 (reference tool)" },
    })
    if (!res.ok) return null
    const data = await res.json() as { lat: string; lon: string }[]
    if (!data.length) return null
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

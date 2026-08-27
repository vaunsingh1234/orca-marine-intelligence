import { type Coordinates, type PlaceLabel } from './place'

type ReverseResponse = {
  city?: string
  locality?: string
  principalSubdivision?: string
  countryName?: string
}

export async function reverseGeocode(coords: Coordinates, signal?: AbortSignal): Promise<PlaceLabel> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')
  url.searchParams.set('latitude', String(coords.latitude))
  url.searchParams.set('longitude', String(coords.longitude))
  url.searchParams.set('localityLanguage', 'en')

  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Could not resolve locality.')

  const data = (await response.json()) as ReverseResponse
  const locality = data.city?.trim() || data.locality?.trim() || data.principalSubdivision?.trim()
  if (!locality) throw new Error('Could not resolve locality.')

  const region = data.principalSubdivision?.trim()
  return {
    locality,
    region: region && region !== locality ? region : undefined,
  }
}

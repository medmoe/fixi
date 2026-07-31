import nominatimClient from '@/lib/api/nominatimClient.ts'

import type {LocationSuggestion, NominatimSearchResult} from '@/features/user/types/location.types.ts'

// Shorter queries match too much to be useful and waste Nominatim's rate budget.
export const MIN_LOCATION_QUERY_LENGTH = 3

export const DEFAULT_LOCATION_RESULT_LIMIT = 5

const isValidLatitude = (value: number): boolean => Number.isFinite(value) && value >= -90 && value <= 90

const isValidLongitude = (value: number): boolean => Number.isFinite(value) && value >= -180 && value <= 180

// Nominatim returns coordinates as strings, and occasionally rows we can't use.
// Dropping them here keeps every suggestion the UI offers submittable.
const toSuggestion = (result: NominatimSearchResult): LocationSuggestion | null => {
    const latitude = Number(result.lat)
    const longitude = Number(result.lon)

    if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null
    if (!result.display_name) return null

    return {
        id: String(result.place_id),
        display_name: result.display_name,
        latitude,
        longitude,
    }
}

export const geocodingApi = {
    searchLocations: async (
        query: string,
        limit: number = DEFAULT_LOCATION_RESULT_LIMIT,
    ): Promise<LocationSuggestion[]> => {
        const trimmed = query.trim()
        if (trimmed.length < MIN_LOCATION_QUERY_LENGTH) return []

        const {data} = await nominatimClient.get<NominatimSearchResult[]>('/search', {
            params: {
                q: trimmed,
                format: 'jsonv2',
                addressdetails: 1,
                limit,
            },
        })

        if (!Array.isArray(data)) return []

        return data
            .map(toSuggestion)
            .filter((suggestion): suggestion is LocationSuggestion => suggestion !== null)
    },
}

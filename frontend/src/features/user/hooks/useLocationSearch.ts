import {useQuery} from '@tanstack/react-query'
import {geocodingApi, MIN_LOCATION_QUERY_LENGTH} from '@/lib/api/geocodingApi'
import {useDebouncedValue} from '@/lib/hooks/useDebouncedValue'
import type {LocationSuggestion} from '@/features/user/types/location.types.ts'

export const LOCATION_SEARCH_QUERY_KEY = 'location-search'

// Nominatim's usage policy allows at most 1 request/second per client.
export const LOCATION_SEARCH_DEBOUNCE_MS = 400

const EMPTY_SUGGESTIONS: LocationSuggestion[] = []

export const useLocationSearch = (query: string) => {
    const debouncedQuery = useDebouncedValue(query, LOCATION_SEARCH_DEBOUNCE_MS)
    const searchTerm = debouncedQuery.trim()

    const result = useQuery({
        queryKey: [LOCATION_SEARCH_QUERY_KEY, searchTerm],
        queryFn: () => geocodingApi.searchLocations(searchTerm),
        enabled: searchTerm.length >= MIN_LOCATION_QUERY_LENGTH,
        staleTime: 1000 * 60 * 5, // place names don't move; 5 minutes spares the service
        retry: false,             // retrying a rate-limited service only makes it worse
    })

    return {
        ...result,
        suggestions: result.data ?? EMPTY_SUGGESTIONS,
        searchTerm,
    }
}

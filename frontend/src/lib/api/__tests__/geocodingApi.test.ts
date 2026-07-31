import {beforeEach, describe, expect, it, vi} from 'vitest'
import {geocodingApi} from '../geocodingApi'
import nominatimClient from '../nominatimClient'
import type {NominatimSearchResult} from '@/features/user'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../nominatimClient', () => ({
    default: {
        get: vi.fn(),
    },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const nominatimResults: NominatimSearchResult[] = [
    {
        place_id: 298248,
        osm_type: 'relation',
        osm_id: 175905,
        lat: '40.7127281',
        lon: '-74.0060152',
        display_name: 'New York, United States',
        type: 'city',
        category: 'place',
    },
    {
        place_id: 100722,
        osm_type: 'relation',
        osm_id: 5750005,
        lat: '43.000351',
        lon: '-75.4999',
        display_name: 'New York, New York State, United States',
        type: 'state',
        category: 'boundary',
    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockGet = vi.mocked(nominatimClient.get)

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('geocodingApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ─── searchLocations ────────────────────────────────────────────────────────

    describe('searchLocations', () => {
        it('calls GET /search on the Nominatim client', async () => {
            mockGet.mockResolvedValueOnce({data: nominatimResults})
            await geocodingApi.searchLocations('New York')
            expect(mockGet).toHaveBeenCalledWith('/search', expect.anything())
        })

        it('sends the query and the JSON format params', async () => {
            mockGet.mockResolvedValueOnce({data: nominatimResults})
            await geocodingApi.searchLocations('New York')
            expect(mockGet).toHaveBeenCalledWith('/search', {
                params: {
                    q: 'New York',
                    format: 'jsonv2',
                    addressdetails: 1,
                    limit: 5,
                },
            })
        })

        it('honors a custom result limit', async () => {
            mockGet.mockResolvedValueOnce({data: nominatimResults})
            await geocodingApi.searchLocations('New York', 8)
            expect(mockGet).toHaveBeenCalledWith(
                '/search',
                expect.objectContaining({params: expect.objectContaining({limit: 8})}),
            )
        })

        it('maps results to location suggestions with numeric coordinates', async () => {
            mockGet.mockResolvedValueOnce({data: nominatimResults})
            const suggestions = await geocodingApi.searchLocations('New York')
            expect(suggestions).toEqual([
                {
                    id: '298248',
                    display_name: 'New York, United States',
                    latitude: 40.7127281,
                    longitude: -74.0060152,
                },
                {
                    id: '100722',
                    display_name: 'New York, New York State, United States',
                    latitude: 43.000351,
                    longitude: -75.4999,
                },
            ])
        })

        it('returns coordinates as numbers, not strings', async () => {
            mockGet.mockResolvedValueOnce({data: nominatimResults})
            const [first] = await geocodingApi.searchLocations('New York')
            expect(typeof first.latitude).toBe('number')
            expect(typeof first.longitude).toBe('number')
        })

        it('returns an empty array when Nominatim finds nothing', async () => {
            mockGet.mockResolvedValueOnce({data: []})
            await expect(geocodingApi.searchLocations('zzzzzzzz')).resolves.toEqual([])
        })

        it('discards results with unparseable coordinates', async () => {
            mockGet.mockResolvedValueOnce({
                data: [{...nominatimResults[0], lat: 'not-a-number'}, nominatimResults[1]],
            })
            const suggestions = await geocodingApi.searchLocations('New York')
            expect(suggestions).toHaveLength(1)
            expect(suggestions[0].id).toBe('100722')
        })

        it('discards results with out-of-range coordinates', async () => {
            mockGet.mockResolvedValueOnce({
                data: [{...nominatimResults[0], lat: '120.5'}, nominatimResults[1]],
            })
            const suggestions = await geocodingApi.searchLocations('New York')
            expect(suggestions).toHaveLength(1)
            expect(suggestions[0].id).toBe('100722')
        })

        it('does not call Nominatim for a query below the minimum length', async () => {
            await expect(geocodingApi.searchLocations('ny')).resolves.toEqual([])
            expect(mockGet).not.toHaveBeenCalled()
        })

        it('does not call Nominatim for a blank query', async () => {
            await expect(geocodingApi.searchLocations('   ')).resolves.toEqual([])
            expect(mockGet).not.toHaveBeenCalled()
        })

        it('trims the query before sending it', async () => {
            mockGet.mockResolvedValueOnce({data: nominatimResults})
            await geocodingApi.searchLocations('  New York  ')
            expect(mockGet).toHaveBeenCalledWith(
                '/search',
                expect.objectContaining({params: expect.objectContaining({q: 'New York'})}),
            )
        })

        it('propagates request errors to the caller', async () => {
            mockGet.mockRejectedValueOnce(new Error('Network error'))
            await expect(geocodingApi.searchLocations('New York')).rejects.toThrow('Network error')
        })

        it('tolerates a non-array response body', async () => {
            mockGet.mockResolvedValueOnce({data: null})
            await expect(geocodingApi.searchLocations('New York')).resolves.toEqual([])
        })
    })
})

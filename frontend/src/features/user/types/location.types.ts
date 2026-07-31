// Raw OpenStreetMap / Nominatim search result — only the fields we consume.
// See https://nominatim.org/release-docs/latest/api/Search/
export interface NominatimSearchResult {
    place_id: number,
    osm_type: string,
    osm_id: number,
    lat: string,
    lon: string,
    display_name: string,
    type: string,
    category?: string,
}

// Normalized suggestion the UI and the form work with.
export interface LocationSuggestion {
    id: string,
    display_name: string,
    latitude: number,
    longitude: number,
}

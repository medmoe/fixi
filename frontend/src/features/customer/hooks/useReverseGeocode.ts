import {useQuery} from "@tanstack/react-query"
import {geocodingApi} from "@/lib";

/**
 * Reverse-geocodes coordinates into a human-readable address via OSM Nominatim,
 * mirroring the forward search used by LocationSearchField / useLocationSearch.
 * Disabled until valid coordinates are provided.
 */
export const useReverseGeocode = (latitude: number | null, longitude: number | null) => {
    return useQuery({
        queryKey: ["reverse-geocode", latitude, longitude],
        queryFn: () => geocodingApi.reverseGeocode(latitude as number, longitude as number),
        enabled: latitude !== null && longitude !== null,
        staleTime: Infinity, // a given lat/lng pair's address never changes
        retry: 1,
    });
};
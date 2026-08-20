import React, {useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {AlertCircle, Loader2, MapPin, Navigation} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {LocationSearchField} from '@/features/user/components/fields/LocationSearchField';
import {useReverseGeocode} from '../hooks/useReverseGeocode';
import {useUpdateUser} from '@/features/user';

interface LocationPickerFormValues {
    display_location: string | null;
    latitude: number | null;
    longitude: number | null;
}

interface LocationPickerProps {
    username: string;
    onConfirmed?: () => void;
}

type GeoErrorReason = 'denied' | 'unavailable' | 'timeout' | null;

export const LocationPicker: React.FC<LocationPickerProps> = ({username, onConfirmed}) => {
    const [isLocating, setIsLocating] = useState(false);
    const [geoError, setGeoError] = useState<GeoErrorReason>(null);
    const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);

    const methods = useForm<LocationPickerFormValues>({
        defaultValues: {display_location: null, latitude: null, longitude: null},
    });
    const {handleSubmit, setValue, watch, formState: {isValid}} = methods;

    const latitude = watch('latitude');
    const longitude = watch('longitude');

    const {mutate: updateLocation, isPending: isSaving} = useUpdateUser(username);

    // once geolocation returns coordinates, reverse-geocode them into a
    // readable address and write both into the form
    const {data: reverseGeocodedAddress, isFetching: isReverseGeocoding} = useReverseGeocode(
        pendingCoords?.lat ?? null,
        pendingCoords?.lng ?? null
    );

    React.useEffect(() => {
        if (pendingCoords && reverseGeocodedAddress) {
            setValue('latitude', pendingCoords.lat, {shouldValidate: true});
            setValue('longitude', pendingCoords.lng, {shouldValidate: true});
            setValue('display_location', reverseGeocodedAddress, {shouldValidate: true});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingCoords, reverseGeocodedAddress]);

    const handleUseMyLocation = () => {
        setGeoError(null);
        setIsLocating(true);

        if (!navigator.geolocation) {
            setGeoError('unavailable');
            setIsLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setPendingCoords({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setIsLocating(false);
            },
            (error) => {
                setIsLocating(false);
                if (error.code === error.PERMISSION_DENIED) {
                    setGeoError('denied');
                } else if (error.code === error.TIMEOUT) {
                    setGeoError('timeout');
                } else {
                    setGeoError('unavailable');
                }
                // On any geolocation failure, the manual LocationSearchField
                // below remains available as the fallback — nothing further
                // needs to happen here to "reveal" it since it's always rendered.
            },
            {timeout: 10_000}
        );
    };

    const onSubmit = (values: LocationPickerFormValues) => {
        if (values.display_location === null || values.latitude === null || values.longitude === null) {
            return;
        }
        updateLocation(
            {
                display_location: values.display_location,
                latitude: values.latitude,
                longitude: values.longitude,
            },
            {
                onSuccess: () => onConfirmed?.(),
            }
        );
    };

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-label="Location picker">

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleUseMyLocation}
                    disabled={isLocating || isReverseGeocoding}
                    className="w-full flex items-center gap-2"
                >
                    {isLocating || isReverseGeocoding ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>
                    ) : (
                        <Navigation className="h-4 w-4" aria-hidden="true"/>
                    )}
                    Use my location
                </Button>

                {geoError && (
                    <p className="text-xs text-destructive flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3 w-3" aria-hidden="true"/>
                        {geoError === 'denied' &&
                            'Location access was denied. Enter your address manually below.'}
                        {geoError === 'timeout' &&
                            'Could not get your location in time. Enter your address manually below.'}
                        {geoError === 'unavailable' &&
                            'Location services are unavailable. Enter your address manually below.'}
                    </p>
                )}

                <div className="relative flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-px flex-1 bg-border"/>
                    or
                    <div className="h-px flex-1 bg-border"/>
                </div>

                <LocationSearchField/>

                {/* Hidden fields mirroring the form's lat/lng state — populated by
                    either "Use my location" or a LocationSearchField selection.
                    Exposed as actual inputs (not just internal RHF state) so the
                    captured coordinates are inspectable/testable directly in the DOM. */}
                <input type="hidden" data-testid="latitude-field" value={latitude ?? ''} readOnly/>
                <input type="hidden" data-testid="longitude-field" value={longitude ?? ''} readOnly/>

                <Button
                    type="submit"
                    disabled={!isValid || isSaving}
                    className="w-full"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true"/>
                            Saving...
                        </>
                    ) : (
                        <>
                            <MapPin className="mr-2 h-4 w-4" aria-hidden="true"/>
                            Confirm location
                        </>
                    )}
                </Button>

            </form>
        </FormProvider>
    );
};
import React, {useState} from 'react'
import {useFormContext} from 'react-hook-form'
import {Loader2, MapPin, Search, X} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {MIN_LOCATION_QUERY_LENGTH} from '@/lib/api/geocodingApi'
import {useLocationSearch} from '@/features/user'
import type {LocationSuggestion} from '@/features/user/types/location.types.ts'

const SUGGESTION_LIST_ID = 'location-suggestions'

/**
 * Location autocomplete backed by OpenStreetMap.
 *
 * Coordinates are only ever written from a selected suggestion — typing sets the
 * label and nulls the coordinates, so ungeocodable text fails userUpdateSchema's
 * all-or-none rule instead of reaching the backend.
 */
export const LocationSearchField: React.FC = () => {
    const {t} = useTranslation('user')
    const {control, setValue, watch, trigger} = useFormContext()
    const [isOpen, setIsOpen] = useState(false)

    const displayLocation: string | null = watch('display_location') ?? null
    const latitude: number | null = watch('latitude') ?? null
    const longitude: number | null = watch('longitude') ?? null
    const inputValue = displayLocation ?? ''
    const isConfirmed = inputValue.length > 0 && latitude !== null && longitude !== null

    // A confirmed selection is not a search term — don't re-query what the user just picked.
    const {suggestions, isFetching, isError, searchTerm} = useLocationSearch(isConfirmed ? '' : inputValue)

    const writeLocation = (location: Partial<LocationSuggestion> | null) => {
        const options = {shouldDirty: true, shouldValidate: true}
        setValue('display_location', location?.display_name ?? null, options)
        setValue('latitude', location?.latitude ?? null, options)
        setValue('longitude', location?.longitude ?? null, options)
        trigger()
    }

    const handleQueryChange = (value: string) => {
        // Typed text is a label without coordinates until a suggestion is picked.
        setValue('display_location', value.length > 0 ? value : null, {shouldDirty: true, shouldValidate: true})
        setValue('latitude', null, {shouldDirty: true, shouldValidate: true})
        setValue('longitude', null, {shouldDirty: true, shouldValidate: true})
        setIsOpen(true)
    }

    const handleSelect = (suggestion: LocationSuggestion) => {
        writeLocation(suggestion)
        setIsOpen(false)
    }

    const handleClear = () => {
        writeLocation(null)
        setIsOpen(false)
    }

    const hasSuggestions = suggestions.length > 0
    const isListOpen = isOpen && hasSuggestions
    const hasSearched = searchTerm.length >= MIN_LOCATION_QUERY_LENGTH
    const showNoResults = hasSearched && !isFetching && !isError && !hasSuggestions
    const showUnconfirmedHint = inputValue.trim().length > 0 && !isConfirmed

    return (
        <FormField
            control={control}
            name="display_location"
            render={() => (
                <FormItem>
                    <FormLabel className="flex items-center gap-1">
                        <MapPin className="h-3 w-3"/>
                        {t('locationSearchField.label')}
                    </FormLabel>
                    <div className="relative">
                        <Search
                            className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                            aria-hidden="true"
                        />
                        {/* FormControl must wrap the input itself — it forwards the id
                            that FormLabel points at, so the label stays associated. */}
                        <FormControl>
                            <Input
                                role="combobox"
                                aria-expanded={isListOpen}
                                aria-controls={SUGGESTION_LIST_ID}
                                aria-autocomplete="list"
                                autoComplete="off"
                                placeholder={t('locationSearchField.placeholder')}
                                className="ps-9 pe-9"
                                value={inputValue}
                                onChange={(event) => handleQueryChange(event.target.value)}
                                onFocus={() => setIsOpen(true)}
                            />
                        </FormControl>
                        {inputValue.length > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t('locationSearchField.clearAriaLabel')}
                                onClick={handleClear}
                                className="absolute end-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-destructive"
                            >
                                <X className="h-4 w-4"/>
                            </Button>
                        )}

                        {isListOpen && (
                            <ul
                                id={SUGGESTION_LIST_ID}
                                role="listbox"
                                aria-label={t('locationSearchField.suggestionsAriaLabel')}
                                className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border border-border bg-popover shadow-md"
                            >
                                {suggestions.map((suggestion) => (
                                    <li key={suggestion.id}>
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={false}
                                            onClick={() => handleSelect(suggestion)}
                                            className="w-full text-start px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                                        >
                                            {suggestion.display_name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {isFetching && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin"/>
                            {t('locationSearchField.searching')}
                        </p>
                    )}

                    {isError && (
                        <p className="text-xs text-destructive">
                            {t('locationSearchField.searchError')}
                        </p>
                    )}

                    {showNoResults && (
                        <p className="text-xs text-muted-foreground">
                            {t('locationSearchField.noResults')}
                        </p>
                    )}

                    {isConfirmed && (
                        <FormDescription className="text-xs">
                            {t('locationSearchField.coordinatesLabel', {lat: latitude, lon: longitude})}
                        </FormDescription>
                    )}

                    {showUnconfirmedHint && (
                        <p className="text-xs text-amber-600">
                            {t('locationSearchField.unconfirmedHint')}
                        </p>
                    )}

                    <FormMessage/>
                </FormItem>
            )}
        />
    )
}

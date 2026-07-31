// src/features/user/components/fields/__tests__/LocationSearchField.test.tsx

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {FormProvider, useForm} from 'react-hook-form'
import type {ReactNode} from 'react'
import {LocationSearchField} from '../LocationSearchField'
import {type LocationSuggestion, useLocationSearch} from '@/features/user'
import {NOT_GEOCODED_MESSAGE} from "@/features/user/schemas/userSchema.ts";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/features/user', () => ({
    useLocationSearch: vi.fn(),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockSuggestions: LocationSuggestion[] = [
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
]

type LocationFormValues = {
    display_location: string | null
    latitude: number | null
    longitude: number | null
}

const emptyLocation: LocationFormValues = {
    display_location: null,
    latitude: null,
    longitude: null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let submitted: LocationFormValues | null = null

const Harness = ({defaultValues, children}: { defaultValues: LocationFormValues, children?: ReactNode }) => {
    const form = useForm<LocationFormValues>({defaultValues})
    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit((values) => {
                submitted = values
            })}>
                <LocationSearchField/>
                {children}
                <button type="submit">Save</button>
            </form>
        </FormProvider>
    )
}

const renderField = (defaultValues: LocationFormValues = emptyLocation) =>
    render(<Harness defaultValues={defaultValues}/>)

const mockSearchState = (overrides: Record<string, unknown> = {}) => {
    vi.mocked(useLocationSearch).mockReturnValue({
        suggestions: [],
        isFetching: false,
        isError: false,
        searchTerm: '',
        ...overrides,
    } as any)
}

const getInput = () => screen.getByRole('combobox', {name: /location/i})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LocationSearchField', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        submitted = null
        mockSearchState()
    })

    // ─── Rendering ──────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders a location combobox', () => {
            renderField()
            expect(getInput()).toBeInTheDocument()
        })
        it('renders the field label', () => {
            renderField()
            expect(screen.getByText('Location')).toBeInTheDocument()
        })
        it('shows a placeholder prompting a search', () => {
            renderField()
            expect(getInput()).toHaveAttribute('placeholder', expect.stringMatching(/search/i))
        })
        it('prefills the input with the saved location', () => {
            renderField({display_location: 'Boston, United States', latitude: 42.36, longitude: -71.05})
            expect(getInput()).toHaveValue('Boston, United States')
        })
        it('renders an empty input when no location is saved', () => {
            renderField()
            expect(getInput()).toHaveValue('')
        })
        it('marks the combobox as collapsed initially', () => {
            renderField()
            expect(getInput()).toHaveAttribute('aria-expanded', 'false')
        })
        it('does not render a suggestion list initially', () => {
            renderField()
            expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
        })
    })

    // ─── Searching ──────────────────────────────────────────────────────────────

    describe('searching', () => {
        it('passes the typed query to useLocationSearch', async () => {
            renderField()
            await act(async () => await userEvent.type(getInput(), 'New York'))
            expect(useLocationSearch).toHaveBeenLastCalledWith('New York')
        })
        it('shows a loading indicator while fetching', () => {
            mockSearchState({isFetching: true, searchTerm: 'New York'})
            renderField()
            expect(screen.getByText(/searching/i)).toBeInTheDocument()
        })
        it('shows an error message when the geocoding service fails', () => {
            mockSearchState({isError: true, searchTerm: 'New York'})
            renderField()
            expect(screen.getByText(/could not search locations/i)).toBeInTheDocument()
        })
    })

    // ─── Suggestions ────────────────────────────────────────────────────────────

    describe('suggestions', () => {
        it('renders a suggestion list once results arrive', async () => {
            mockSearchState({suggestions: mockSuggestions, searchTerm: 'New York'})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'New York'))
            expect(screen.getByRole('listbox')).toBeInTheDocument()
        })
        it('renders one option per suggestion', async () => {
            mockSearchState({suggestions: mockSuggestions, searchTerm: 'New York'})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'New York'))
            expect(screen.getAllByRole('option')).toHaveLength(2)
        })
        it('renders each suggestion display name', async () => {
            mockSearchState({suggestions: mockSuggestions, searchTerm: 'New York'})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'New York'))
            expect(screen.getByText('New York, United States')).toBeInTheDocument()
            expect(screen.getByText('New York, New York State, United States')).toBeInTheDocument()
        })
        it('marks the combobox as expanded when suggestions are shown', async () => {
            mockSearchState({suggestions: mockSuggestions, searchTerm: 'New York'})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'New York'))
            expect(getInput()).toHaveAttribute('aria-expanded', 'true')
        })
        it('shows an empty-result message when nothing matches', async () => {
            mockSearchState({suggestions: [], searchTerm: 'zzzzzzzz'})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'zzzzzzzz'))
            expect(screen.getByText(/no locations found/i)).toBeInTheDocument()
        })
        it('does not show the empty-result message while still fetching', async () => {
            mockSearchState({suggestions: [], searchTerm: 'New York', isFetching: true})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'New York'))
            expect(screen.queryByText(/no locations found/i)).not.toBeInTheDocument()
        })
    })

    // ─── Selecting a suggestion ─────────────────────────────────────────────────

    describe('selecting a suggestion', () => {
        it('puts the selected display name in the input', async () => {
            mockSearchState({suggestions: mockSuggestions, searchTerm: 'New York'})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'New York'))
            await act(async () => await userEvent.click(screen.getByRole('option', {name: 'New York, United States'})))
            expect(getInput()).toHaveValue('New York, United States')
        })
        it('closes the suggestion list', async () => {
            mockSearchState({suggestions: mockSuggestions, searchTerm: 'New York'})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'New York'))
            await act(async () => await userEvent.click(screen.getByRole('option', {name: 'New York, United States'})))
            expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
        })
        it('does not show the geocoding error after a location is selected from the list', async () => {
            mockSearchState({suggestions: mockSuggestions, searchTerm: 'New York'})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'New York'))
            await act(async () => await userEvent.click(screen.getByRole('option', {name: 'New York, United States'})))
            await waitFor(() => {
                expect(
                    screen.queryByText(NOT_GEOCODED_MESSAGE)
                ).not.toBeInTheDocument()
            })
        })
        it('submits the display name and both coordinates', async () => {
            mockSearchState({suggestions: mockSuggestions, searchTerm: 'New York'})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'New York'))
            await act(async () => await userEvent.click(screen.getByRole('option', {name: 'New York, United States'})))
            await act(async () => await userEvent.click(screen.getByRole('button', {name: 'Save'})))
            await waitFor(() => expect(submitted).toEqual({
                display_location: 'New York, United States',
                latitude: 40.7127281,
                longitude: -74.0060152,
            }))
        })
        it('submits the coordinates of the second suggestion when it is chosen', async () => {
            mockSearchState({suggestions: mockSuggestions, searchTerm: 'New York'})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'New York'))
            await act(async () => await userEvent.click(
                screen.getByRole('option', {name: 'New York, New York State, United States'}),
            ))
            await act(async () => await userEvent.click(screen.getByRole('button', {name: 'Save'})))
            await waitFor(() => expect(submitted).toEqual({
                display_location: 'New York, New York State, United States',
                latitude: 43.000351,
                longitude: -75.4999,
            }))
        })
        it('shows the selected location as confirmed', async () => {
            mockSearchState({suggestions: mockSuggestions, searchTerm: 'New York'})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'New York'))
            await act(async () => await userEvent.click(screen.getByRole('option', {name: 'New York, United States'})))
            expect(screen.getByText(/40\.7127281/)).toBeInTheDocument()
            expect(screen.getByText(/-74\.0060152/)).toBeInTheDocument()
        })
    })

    // ─── Rejecting arbitrary text ───────────────────────────────────────────────

    describe('rejecting arbitrary text', () => {
        it('does not set coordinates for text that was merely typed', async () => {
            mockSearchState({suggestions: mockSuggestions, searchTerm: 'Atlantis'})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'Atlantis'))
            await act(async () => await userEvent.click(screen.getByRole('button', {name: 'Save'})))
            await waitFor(() => expect(submitted).toEqual({
                display_location: 'Atlantis',
                latitude: null,
                longitude: null,
            }))
        })
        it('clears previously selected coordinates when the text is edited', async () => {
            mockSearchState({suggestions: mockSuggestions, searchTerm: 'Boston'})
            renderField({display_location: 'Boston, United States', latitude: 42.36, longitude: -71.05})
            await act(async () => await userEvent.type(getInput(), ' edited'))
            await act(async () => await userEvent.click(screen.getByRole('button', {name: 'Save'})))
            await waitFor(() => expect(submitted).toMatchObject({
                latitude: null,
                longitude: null,
            }))
        })
        it('warns that the typed text is not a confirmed location', async () => {
            mockSearchState({suggestions: mockSuggestions, searchTerm: 'Atlantis'})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'Atlantis'))
            expect(screen.getByText(/select a location from the suggestions/i)).toBeInTheDocument()
        })
        it('drops the warning once a suggestion is selected', async () => {
            mockSearchState({suggestions: mockSuggestions, searchTerm: 'New York'})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'New York'))
            await act(async () => await userEvent.click(screen.getByRole('option', {name: 'New York, United States'})))
            expect(screen.queryByText(/select a location from the suggestions/i)).not.toBeInTheDocument()
        })
    })

    // ─── Clearing ───────────────────────────────────────────────────────────────

    describe('clearing', () => {
        it('renders a clear button when a location is set', () => {
            renderField({display_location: 'Boston, United States', latitude: 42.36, longitude: -71.05})
            expect(screen.getByRole('button', {name: /clear location/i})).toBeInTheDocument()
        })
        it('does not render a clear button when no location is set', () => {
            renderField()
            expect(screen.queryByRole('button', {name: /clear location/i})).not.toBeInTheDocument()
        })
        it('empties the input when cleared', async () => {
            renderField({display_location: 'Boston, United States', latitude: 42.36, longitude: -71.05})
            await act(async () => await userEvent.click(screen.getByRole('button', {name: /clear location/i})))
            expect(getInput()).toHaveValue('')
        })
        it('submits nulls for all three fields when cleared', async () => {
            renderField({display_location: 'Boston, United States', latitude: 42.36, longitude: -71.05})
            await act(async () => await userEvent.click(screen.getByRole('button', {name: /clear location/i})))
            await act(async () => await userEvent.click(screen.getByRole('button', {name: 'Save'})))
            await waitFor(() => expect(submitted).toEqual({
                display_location: null,
                latitude: null,
                longitude: null,
            }))
        })
        it('empties the input when the text is deleted by hand', async () => {
            renderField({display_location: 'Boston, United States', latitude: 42.36, longitude: -71.05})
            await act(async () => await userEvent.clear(getInput()))
            await act(async () => await userEvent.click(screen.getByRole('button', {name: 'Save'})))
            await waitFor(() => expect(submitted).toEqual({
                display_location: null,
                latitude: null,
                longitude: null,
            }))
        })
        it('clears the geocoding error when the location is cleared after being selected', async () => {
            mockSearchState({suggestions: mockSuggestions, searchTerm: 'New York'})
            renderField()
            await act(async () => await userEvent.type(getInput(), 'New York'))
            await act(async () => await userEvent.click(screen.getByRole('button', {name: /clear location/i})))
            await waitFor(() => {
                expect(
                    screen.queryByText(NOT_GEOCODED_MESSAGE)
                ).not.toBeInTheDocument()
            })
        })
    })
})

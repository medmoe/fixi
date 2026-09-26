import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {MemoryRouter} from 'react-router-dom'
import {mockJob} from '@/mocks'
import {mockWorker} from '@/features/worker/tests/mocks.ts'
import {SuggestedWorkersPanel} from '../../components/SuggestedWorkersPanel'
import {useNearbyWorkers} from '../../hooks/useNearbyWorkers'

vi.mock('../../hooks/useNearbyWorkers', () => ({useNearbyWorkers: vi.fn()}))
vi.mock('@/features/worker', () => ({
    WorkerCard: ({profile}: any) => <div data-testid="worker-card">{profile.id}</div>,
    WorkerCardSkeleton: () => <div data-testid="worker-card-skeleton"/>,
}))

const baseHook = {workers: [], totalCount: 0, hasMore: false, loadMore: vi.fn(), isLoading: false, isFetchingNextPage: false, isError: false}
const jobWithLocation = {...mockJob, id: 7, coordinates: {latitude: 36.75, longitude: 3.06}}

const renderPanel = (job = jobWithLocation) => render(
    <MemoryRouter><SuggestedWorkersPanel job={job as any}/></MemoryRouter>
)

describe('SuggestedWorkersPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useNearbyWorkers).mockReturnValue(baseHook as any)
    })

    it('prompts for a location, links to the edit form, and does not query, when the job has none', () => {
        renderPanel({...jobWithLocation, coordinates: null} as any)

        expect(screen.getByText('Add a location to see workers near you.')).toBeInTheDocument()
        expect(screen.getByRole('link', {name: 'Add location'})).toHaveAttribute('href', '/dashboard/jobs/7/edit')
        expect(useNearbyWorkers).toHaveBeenCalledWith(7, false)
    })

    it('queries for nearby workers when the job has a location', () => {
        renderPanel()
        expect(useNearbyWorkers).toHaveBeenCalledWith(7, true)
    })

    it('shows skeletons while loading', () => {
        vi.mocked(useNearbyWorkers).mockReturnValue({...baseHook, isLoading: true} as any)
        renderPanel()
        expect(screen.getAllByTestId('worker-card-skeleton').length).toBeGreaterThan(0)
    })

    it('shows an error message when the query fails', () => {
        vi.mocked(useNearbyWorkers).mockReturnValue({...baseHook, isError: true} as any)
        renderPanel()
        expect(screen.getByText("Couldn't load suggested workers. Please try again later.")).toBeInTheDocument()
    })

    it('shows the empty state when nobody matches', () => {
        renderPanel()
        expect(screen.getByText(/No available workers cover this area right now/)).toBeInTheDocument()
    })

    it('renders a card per worker with a count', () => {
        vi.mocked(useNearbyWorkers).mockReturnValue({...baseHook, workers: [mockWorker(1), mockWorker(2)], totalCount: 2} as any)
        renderPanel()

        expect(screen.getAllByTestId('worker-card')).toHaveLength(2)
        expect(screen.getByText('2 available workers nearby')).toBeInTheDocument()
    })

    it('loads more on demand', async () => {
        const loadMore = vi.fn()
        vi.mocked(useNearbyWorkers).mockReturnValue({...baseHook, workers: [mockWorker(1)], totalCount: 5, hasMore: true, loadMore} as any)
        renderPanel()

        await userEvent.click(screen.getByRole('button', {name: 'Show more workers'}))
        expect(loadMore).toHaveBeenCalled()
    })
})

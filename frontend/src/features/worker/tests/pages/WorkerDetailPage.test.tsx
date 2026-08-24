import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import {useParams} from 'react-router-dom'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {QueryClient} from '@tanstack/react-query'
import {mockWorker} from '@/features/worker/tests/mocks.ts'
import {useWorkerProfilePublic} from '@/features/worker/hooks/useWorkerProfile'
import {WorkerDetailPage} from '@/features/worker/pages/WorkerDetailPage'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>(
        'react-router-dom'
    )

    return {
        ...actual,
        useParams: vi.fn(),
    }
})

vi.mock('@/features/worker/hooks/useWorkerProfile', async () => {
    const actual = await vi.importActual<
        typeof import('@/features/worker/hooks/useWorkerProfile')
    >('@/features/worker/hooks/useWorkerProfile')

    return {
        ...actual,
        useWorkerProfilePublic: vi.fn(),
    }
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WorkerDetailPage', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        queryClient = createQueryClient()
        vi.clearAllMocks()

        vi.mocked(useParams).mockReturnValue({
            workerId: '123',
        })
    })

    // ─── Loading state ─────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('shows loading skeleton when profile is loading', () => {
            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: undefined,
                isLoading: true,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.getByRole('status', {
                    name: /loading worker profile/i,
                })
            ).toBeInTheDocument()
        })

        it('does not show worker details while loading', () => {
            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: undefined,
                isLoading: true,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
            expect(screen.queryByText('About')).not.toBeInTheDocument()
            expect(screen.queryByText('Hourly rate')).not.toBeInTheDocument()
        })
    })

    // ─── Error state ───────────────────────────────────────────────────────────

    describe('error state', () => {
        it('shows worker not found when profile fetch fails', () => {
            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: undefined,
                isLoading: false,
                isError: true,
                error: new Error('Network error'),
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.getByText('Worker not found')
            ).toBeInTheDocument()

            expect(
                screen.getByText(
                    /This worker profile doesn't exist or is no longer available/
                )
            ).toBeInTheDocument()
        })

        it('shows worker not found when profile is null', () => {
            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: null,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.getByText('Worker not found')
            ).toBeInTheDocument()
        })

        it('renders back to search link on error', () => {
            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: undefined,
                isLoading: false,
                isError: true,
                error: new Error('Network error'),
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            const link = screen.getByRole('link', {
                name: /back to search/i,
            })

            expect(link).toHaveAttribute('href', '/workers/search')
        })

        it('does not show worker details on error', () => {
            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: undefined,
                isLoading: false,
                isError: true,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(screen.queryByText('Available now')).not.toBeInTheDocument()
            expect(screen.queryByText('Currently unavailable')).not.toBeInTheDocument()
            expect(screen.queryByText('Hourly rate')).not.toBeInTheDocument()
        })
    })

    // ─── Query parameter ───────────────────────────────────────────────────────

    describe('worker ID', () => {
        it('passes the route worker ID as a number to the hook', () => {
            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: mockWorker(123),
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(useWorkerProfilePublic)
                .toHaveBeenCalledWith(123)
        })

        it('converts the string route parameter to a number', () => {
            vi.mocked(useParams).mockReturnValue({
                workerId: '456',
            })

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: mockWorker(456),
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(useWorkerProfilePublic)
                .toHaveBeenCalledWith(456)
        })
    })

    // ─── Success state ─────────────────────────────────────────────────────────

    describe('success state', () => {
        beforeEach(() => {
            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: mockWorker(123),
                isLoading: false,
                isError: false,
            } as any)
        })

        it('renders worker name', () => {
            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.getByRole('heading', {name: 'Worker 123'})
            ).toBeInTheDocument()
        })

        it('renders worker initials when avatar is unavailable', () => {
            const profile = {
                ...mockWorker(123),
                avatar_url: null,
            }

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: profile,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(screen.getByText('W1')).toBeInTheDocument()
        })

        it('renders verified indicator for verified worker', () => {
            const profile = {
                ...mockWorker(123),
                is_verified: true,
            }

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: profile,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.getByTitle('Verified worker')
            ).toBeInTheDocument()
        })

        it('does not render verified indicator for unverified worker', () => {
            const profile = {
                ...mockWorker(123),
                is_verified: false,
            }

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: profile,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.queryByTitle('Verified worker')
            ).not.toBeInTheDocument()
        })

        it('renders New rating', () => {
            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(screen.getByText('New')).toBeInTheDocument()
        })

        it('renders years of experience', () => {
            const profile = {
                ...mockWorker(123),
                years_of_experience: 8,
            }

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: profile,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.getByText('· 8 yrs experience')
            ).toBeInTheDocument()

            expect(
                screen.getByText('8 years')
            ).toBeInTheDocument()
        })

        it('does not render experience when value is null', () => {
            const profile = {
                ...mockWorker(123),
                years_of_experience: null,
            }

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: profile,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.queryByText(/yrs experience/)
            ).not.toBeInTheDocument()

            expect(
                screen.queryByText(/years$/)
            ).not.toBeInTheDocument()
        })

        it('shows Available now when worker is available', () => {
            const profile = {
                ...mockWorker(123),
                is_available: true,
            }

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: profile,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.getByText('Available now')
            ).toBeInTheDocument()
        })

        it('shows Currently unavailable when worker is unavailable', () => {
            const profile = {
                ...mockWorker(123),
                is_available: false,
            }

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: profile,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.getByText('Currently unavailable')
            ).toBeInTheDocument()
        })
    })

    // ─── Trade categories ─────────────────────────────────────────────────────

    describe('trade categories', () => {
        it('renders worker trade categories', () => {
            const profile = {
                ...mockWorker(123),
                trade_categories: [
                    {
                        id: 1,
                        trade_category_id: 1,
                        worker_profile_id: 123,
                        skill_level: 'senior',
                        trade_category: {
                            id: 1,
                            name: 'electrician',
                            display_name: 'Electrical',
                            created_at: '2026-01-01',
                            icon_name: 'bolt',
                            parent_id: null,
                        },
                    },
                    {
                        id: 2,
                        trade_category_id: 2,
                        worker_profile_id: 123,
                        skill_level: 'intermediate',
                        trade_category: {
                            id: 2,
                            name: 'plumbing',
                            display_name: 'Plumbing',
                            created_at: '2026-01-01',
                            icon_name: 'wrench',
                            parent_id: null,
                        },
                    },
                ],
            }

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: profile,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.getByText('Electrical')
            ).toBeInTheDocument()

            expect(
                screen.getByText('Plumbing')
            ).toBeInTheDocument()
        })

        it('does not render trade section when there are no trades', () => {
            const profile = {
                ...mockWorker(123),
                trade_categories: [],
            }

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: profile,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.queryByText('Electrical')
            ).not.toBeInTheDocument()
        })
    })

    // ─── Bio ───────────────────────────────────────────────────────────────────

    describe('bio', () => {
        it('renders worker bio when present', () => {
            const profile = {
                ...mockWorker(123),
                bio: 'Experienced electrician specializing in residential work.',
            }

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: profile,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(screen.getByText('About')).toBeInTheDocument()

            expect(
                screen.getByText(
                    'Experienced electrician specializing in residential work.'
                )
            ).toBeInTheDocument()
        })

        it('does not render About section when bio is empty', () => {
            const profile = {
                ...mockWorker(123),
                bio: '',
            }

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: profile,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(screen.queryByText('About')).not.toBeInTheDocument()
        })
    })

    // ─── Details ───────────────────────────────────────────────────────────────

    describe('details', () => {
        it('renders hourly rate', () => {
            const profile = {
                ...mockWorker(123),
                hourly_rate: 75,
            }

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: profile,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.getByText('Hourly rate')
            ).toBeInTheDocument()

            expect(
                screen.getByText('$75.00/hr')
            ).toBeInTheDocument()
        })

        it('renders service radius', () => {
            const profile = {
                ...mockWorker(123),
                service_radius_km: 25,
            }

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: profile,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.getByText('Service radius')
            ).toBeInTheDocument()

            expect(
                screen.getByText('25 km')
            ).toBeInTheDocument()
        })

        it('does not render hourly rate when null', () => {
            const profile = {
                ...mockWorker(123),
                hourly_rate: null,
            }

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: profile,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.queryByText('Hourly rate')
            ).not.toBeInTheDocument()
        })

        it('does not render service radius when null', () => {
            const profile = {
                ...mockWorker(123),
                service_radius_km: null,
            }

            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: profile,
                isLoading: false,
                isError: false,
            } as any)

            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            expect(
                screen.queryByText('Service radius')
            ).not.toBeInTheDocument()
        })
    })

    // ─── Navigation ───────────────────────────────────────────────────────────

    describe('navigation', () => {
        beforeEach(() => {
            vi.mocked(useWorkerProfilePublic).mockReturnValue({
                data: mockWorker(123),
                isLoading: false,
                isError: false,
            } as any)
        })

        it('renders back to search link', () => {
            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            const links = screen.getAllByRole('link', {
                name: /back to search/i,
            })

            expect(links).toHaveLength(1)
            expect(links[0]).toHaveAttribute(
                'href',
                '/workers/search'
            )
        })

        it('renders disabled contact worker button', () => {
            render(
                <WorkerDetailPage/>,
                {wrapper: createWrapper(queryClient)}
            )

            const button = screen.getByRole('button', {
                name: /contact worker/i,
            })

            expect(button).toBeDisabled()
        })
    })
})
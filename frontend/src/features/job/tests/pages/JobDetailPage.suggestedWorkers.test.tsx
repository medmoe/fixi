import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import {MemoryRouter, Route, Routes} from 'react-router-dom'
import {QueryClientProvider} from '@tanstack/react-query'
import {jobApi} from '@/lib'
import {mockJob} from '@/mocks'
import {useUser} from '@/features/user'
import {createTestQueryClient} from '@/test/renderWithProviders'
import {JobDetailPage} from '../../pages/JobDetailPage'

vi.mock('@/lib', () => ({jobApi: {getJob: vi.fn()}}))
vi.mock('@/features/auth', () => ({useAuth: () => ({isAuthenticated: true})}))
vi.mock('@/features/user', () => ({useUser: vi.fn()}))
vi.mock('@/features/review', () => ({ReviewCard: () => null}))
vi.mock('@/features/worker/hooks/useLocalizedTradeName', () => ({useLocalizedTradeName: () => (tc: any) => tc?.name}))
vi.mock('@/features/job', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/features/job')>()),
    SuggestedWorkersPanel: () => <div>Suggested workers panel</div>,
    JobLifecycleActions: () => null,
    ApplyToJobDialog: () => null,
    useMyJobApplication: () => ({data: undefined}),
}))

const OWNER_ID = 10

const renderPage = () => render(
    <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={['/dashboard/jobs/1']} future={{v7_startTransition: true, v7_relativeSplatPath: true}}>
            <Routes>
                <Route path="/dashboard/jobs/:id" element={<JobDetailPage/>}/>
            </Routes>
        </MemoryRouter>
    </QueryClientProvider>
)

describe('JobDetailPage — suggested workers panel', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('shows the panel to the owner of an open job', async () => {
        vi.mocked(jobApi.getJob).mockResolvedValue({...mockJob, user_id: OWNER_ID, status: 'open'})
        vi.mocked(useUser).mockReturnValue({data: {id: OWNER_ID, role_type: 'customer'}} as any)

        renderPage()

        expect(await screen.findByText('Suggested workers panel')).toBeInTheDocument()
    })

    it('hides the panel from anyone who is not the owner', async () => {
        vi.mocked(jobApi.getJob).mockResolvedValue({...mockJob, user_id: OWNER_ID, status: 'open'})
        vi.mocked(useUser).mockReturnValue({data: {id: 99, role_type: 'worker'}} as any)

        renderPage()

        expect(await screen.findByText(mockJob.title)).toBeInTheDocument()
        expect(screen.queryByText('Suggested workers panel')).not.toBeInTheDocument()
    })

    it.each(['assigned', 'in_progress', 'completed', 'cancelled'] as const)('hides the panel once the job is %s', async (status) => {
        vi.mocked(jobApi.getJob).mockResolvedValue({...mockJob, user_id: OWNER_ID, status})
        vi.mocked(useUser).mockReturnValue({data: {id: OWNER_ID, role_type: 'customer'}} as any)

        renderPage()

        expect(await screen.findByText(mockJob.title)).toBeInTheDocument()
        expect(screen.queryByText('Suggested workers panel')).not.toBeInTheDocument()
    })
})

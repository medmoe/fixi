import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import {createMemoryRouter, RouterProvider} from 'react-router-dom'

import {RoleBasedDashboard} from '../RoleBasedDashboard'
import {useUser} from '@/features/user'

vi.mock('@/features/user', () => ({
    useUser: vi.fn(),
}))

vi.mock('@/features/worker/pages/WorkerDashboardPage', () => ({
    WorkerDashboardPage: () => <div>Worker Dashboard</div>,
}))

vi.mock('@/features/auth', () => ({
    DashboardLayout: () => <div>Customer Dashboard</div>,
}))

const renderAt = (path: string) => {
    const router = createMemoryRouter(
        [
            {path: '/dashboard/*', element: <RoleBasedDashboard/>},
            {path: '/admin/users', element: <div>Admin Users</div>},
            {path: '/login', element: <div>Login</div>},
        ],
        {initialEntries: [path]},
    )
    render(<RouterProvider router={router}/>)
    return router
}

describe('RoleBasedDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the customer dashboard for a customer', () => {
        vi.mocked(useUser).mockReturnValue({data: {role_type: 'customer', is_superuser: false}} as any)
        renderAt('/dashboard')

        expect(screen.getByText('Customer Dashboard')).toBeInTheDocument()
    })

    it('renders the worker dashboard for a worker', () => {
        vi.mocked(useUser).mockReturnValue({data: {role_type: 'worker', is_superuser: false}} as any)
        renderAt('/dashboard')

        expect(screen.getByText('Worker Dashboard')).toBeInTheDocument()
    })

    it.each(['customer', 'worker'])('sends a superuser (role_type %s) to the admin panel', (role_type) => {
        vi.mocked(useUser).mockReturnValue({data: {role_type, is_superuser: true}} as any)
        const router = renderAt('/dashboard')

        expect(router.state.location.pathname).toBe('/admin/users')
        expect(screen.getByText('Admin Users')).toBeInTheDocument()
        expect(screen.queryByText('Customer Dashboard')).not.toBeInTheDocument()
    })

    it('sends a superuser away from nested customer routes like job creation', () => {
        vi.mocked(useUser).mockReturnValue({data: {role_type: 'customer', is_superuser: true}} as any)
        const router = renderAt('/dashboard/jobs/create')

        expect(router.state.location.pathname).toBe('/admin/users')
    })

    it('redirects to login when there is no user', () => {
        vi.mocked(useUser).mockReturnValue({data: undefined} as any)
        renderAt('/dashboard')

        expect(screen.getByText('Login')).toBeInTheDocument()
    })
})

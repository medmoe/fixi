// RoleBasedDashboard.tsx — thin dispatcher
import {useUser} from '@/features/user'
import {WorkerDashboardPage} from '@/features/worker/pages/WorkerDashboardPage'
import {CustomerDashboardPage} from '@/features/customer'
import {Navigate} from 'react-router-dom'

export const RoleBasedDashboard: React.FC = () => {
    const {data: user} = useUser()

    if (!user) return <Navigate to="/login" replace/>

    switch (user.role_type) {
        case 'worker':
            return <WorkerDashboardPage/>
        case 'customer':
            return <CustomerDashboardPage/>
        default:
            return <Navigate to="/" replace/>
    }
}
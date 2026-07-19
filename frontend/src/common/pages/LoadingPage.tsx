import {useLocation, useNavigate} from 'react-router-dom'
import {useEffect} from 'react'
import {LoginForm, useAuth} from '@/features/auth'
import {useUser} from "@/features/user";

/**
 * LoginPage wrapper - handles redirect after successful login.
 *
 * If the user was redirected here from a protected route,
 * the `from` state will contain the original path.
 * After login, we redirect back to that path instead of default /dashboard.
 */
export const LoadingPage = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const {isAuthenticated} = useAuth()
    const {data: user} = useUser()

    // If already logged in, redirect away from login page
    useEffect(() => {
        if (isAuthenticated && user) {
            const from = location.state?.from || '/dashboard'

            // Respect role-based routing
            if (user.role_type === 'worker') {
                navigate(from === '/dashboard' ? '/dashboard' : from, {replace: true})
            } else {
                // Customer — no dashboard yet, go to landing or intended non-dashboard route
                navigate(from === '/dashboard' ? '/' : from, {replace: true})
            }
        }
    }, [isAuthenticated, user, navigate, location])

    return <LoginForm/>
}
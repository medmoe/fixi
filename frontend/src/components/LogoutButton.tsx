import React from 'react'
import {useNavigate} from 'react-router-dom'
import {Loader2, LogOut} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {useAuth} from '@/features/auth'
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,} from '@/components/ui/alert-dialog'

/**
 * LogoutButton - Secure logout with confirmation dialog.
 *
 * Features:
 * - Calls POST /api/v1/auth/logout (sends refresh_token cookie automatically)
 * - Clears access_token from sessionStorage
 * - Invalidates React Query cache
 * - Shows loading state during logout
 * - Confirmation dialog to prevent accidental clicks
 */
export const LogoutButton: React.FC = () => {
    const {logout, isLoggingOut} = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        try {
            logout()
            // logout() should:
            // 1. Call POST /api/v1/auth/logout (apiClient handles refresh_token cookie)
            // 2. Clear sessionStorage.removeItem('access_token')
            // 3. Clear React Query cache: queryClient.clear()
            // 4. Reset auth state
            navigate('/login', {replace: true})
        } catch (error) {
            // Even if API fails, clear local state and redirect
            sessionStorage.removeItem('access_token')
            navigate('/login', {replace: true})
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                    aria-label="Logout"
                >
                    <LogOut className="h-4 w-4"/>
                    <span>Logout</span>
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You will be logged out and redirected to the login page.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isLoggingOut ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                Logging out...
                            </>
                        ) : (
                            'Logout'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default LogoutButton
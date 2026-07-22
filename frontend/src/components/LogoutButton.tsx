import React from 'react'
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

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                    aria-label="Logout"
                    data-testid="logout-button"
                >
                    <LogOut className="h-4 w-4"/>
                    <span>Logout</span>
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent data-testid="logout-dialog">
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You will be logged out and redirected to the login page.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel data-testid="logout-cancel">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={logout}
                        disabled={isLoggingOut}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="logout-confirm"
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
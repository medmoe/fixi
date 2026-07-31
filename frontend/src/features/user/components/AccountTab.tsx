import React from 'react'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {useAuth} from '@/features/auth'
import {LocationSearchField, useChangePassword, useDeactivateAccount, type UserPasswordFormValues, userPasswordSchema, type UserUpdateFormValues, userUpdateSchema, useUpdateUser, useUser} from '@/features/user'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from '@/components/ui/form'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger} from '@/components/ui/alert-dialog'
import {ImageIcon, Loader2, Lock, Trash2, UserCircle} from 'lucide-react'

export const AccountTab: React.FC = () => {
    const {data: user} = useUser()
    const {logout} = useAuth()

    if (!user) return null

    // ─── Update Profile Form ────────────────────────────────────────────────
    const updateForm = useForm<UserUpdateFormValues>({
        resolver: zodResolver(userUpdateSchema),
        defaultValues: {
            name: user.name,
            username: user.username,
            email: user.email,
            display_location: user.display_location ?? null,
            latitude: (user as any).latitude ?? null,
            longitude: (user as any).longitude ?? null,
            profile_image_url: user.profile_image_url || '',
        },
    })

    const updateMutation = useUpdateUser(user.username)

    const onUpdateSubmit = (values: UserUpdateFormValues) => {
        // Only send changed fields
        const payload: Partial<UserUpdateFormValues> = {}
        if (values.name !== user.name) payload.name = values.name
        if (values.username !== user.username) payload.username = values.username
        if (values.email !== user.email) payload.email = values.email
        // The three location fields move together — the backend stores them as one
        // PostGIS point, so a partial set would be rejected.
        if ((values.display_location ?? null) !== (user.display_location ?? null)) {
            payload.display_location = values.display_location || null
            payload.latitude = values.latitude ?? null
            payload.longitude = values.longitude ?? null
        }
        if (values.profile_image_url !== (user.profile_image_url || ''))
            payload.profile_image_url = values.profile_image_url || null

        if (Object.keys(payload).length === 0) {
            updateForm.reset(values)
            return
        }

        updateMutation.mutate(payload, {
            onSuccess: () => updateForm.reset(values),
        })
    }

    // ─── Change Password Form ───────────────────────────────────────────────
    const passwordForm = useForm<UserPasswordFormValues>({
        resolver: zodResolver(userPasswordSchema),
        defaultValues: {
            current_password: '',
            new_password: '',
            confirm_password: '',
        },
    })

    const passwordMutation = useChangePassword(user.username)

    const onPasswordSubmit = (values: UserPasswordFormValues) => {
        passwordMutation.mutate(
            {
                current_password: values.current_password,
                new_password: values.new_password,
            },
            {
                onSuccess: () => passwordForm.reset(),
            }
        )
    }

    // ─── Deactivate Account ───────────────────────────────────────────────
    const deactivateMutation = useDeactivateAccount(user.username)

    const handleDeactivate = () => {
        deactivateMutation.mutate(undefined, {
            onSuccess: () => logout(),
        })
    }

    return (
        <div className="space-y-8 max-w-2xl">
            <header className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <UserCircle className="h-8 w-8 text-primary"/>
                    Account Settings
                </h2>
                <p className="text-muted-foreground">
                    Manage your personal information and security.
                </p>
            </header>

            {/* ─── Update Profile ─────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5"/>
                        Profile Information
                    </CardTitle>
                    <CardDescription>
                        Update your name, email, location, and profile image.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...updateForm}>
                        <form
                            onSubmit={updateForm.handleSubmit(onUpdateSubmit)}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={updateForm.control}
                                    name="name"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={updateForm.control}
                                    name="username"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Username</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={updateForm.control}
                                name="email"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <LocationSearchField/>

                            <FormField
                                control={updateForm.control}
                                name="profile_image_url"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Profile Image URL</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://..."
                                                {...field}
                                                value={field.value ?? ''}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                disabled={
                                    !updateForm.formState.isDirty ||
                                    updateMutation.isPending
                                }
                            >
                                {updateMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* ─── Change Password ────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5"/>
                        Change Password
                    </CardTitle>
                    <CardDescription>
                        Update your password. You will need to enter your current
                        password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...passwordForm}>
                        <form
                            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                            className="space-y-4"
                        >
                            <FormField
                                control={passwordForm.control}
                                name="current_password"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Current Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={passwordForm.control}
                                name="new_password"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>New Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={passwordForm.control}
                                name="confirm_password"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>Confirm New Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="submit"
                                disabled={passwordMutation.isPending}
                            >
                                {passwordMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                        Changing...
                                    </>
                                ) : (
                                    'Change Password'
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* ─── Danger Zone ────────────────────────────────────────────── */}
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5"/>
                        Danger Zone
                    </CardTitle>
                    <CardDescription>
                        Once you deactivate your account, you will not be able to
                        log in again. This action can be reversed by contacting
                        support.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4"/>
                                Deactivate Account
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Deactivate your account?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will soft-delete your account and blacklist
                                    your access token. You will be logged out
                                    immediately and will not be able to sign in
                                    again unless support reactivates your account.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDeactivate}
                                    disabled={deactivateMutation.isPending}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {deactivateMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                            Deactivating...
                                        </>
                                    ) : (
                                        'Yes, Deactivate'
                                    )}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    )
}
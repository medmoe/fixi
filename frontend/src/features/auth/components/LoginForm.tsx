import React from 'react'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {Link} from 'react-router-dom'
import {Loader2} from 'lucide-react'
import {type LoginFormValues, loginSchema} from '../schemas/authSchema'
import {useAuth} from '@/features/auth'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from '@/components/ui/form'

export const LoginForm: React.FC = () => {
    const {login, isLoggingIn} = useAuth()

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            username_or_email: '',
            password: '',
        },
    })

    const onSubmit = (values: LoginFormValues) => {
        login(values)
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
                aria-label="Login form"
            >
                {/* Username or Email */}
                <FormField
                    control={form.control}
                    name="username_or_email"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel htmlFor="username-or-email">
                                Username or Email
                            </FormLabel>
                            <FormControl>
                                <Input
                                    id="username-or-email"
                                    type="text"
                                    placeholder="johndoe or john@example.com"
                                    autoComplete="username"
                                    aria-label="Username or email"
                                    {...field}
                                    value={field.value ?? ''}
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                {/* Password */}
                <FormField
                    control={form.control}
                    name="password"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel htmlFor="login-password">
                                Password
                            </FormLabel>
                            <FormControl>
                                <Input
                                    id="login-password"
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    aria-label="Password"
                                    {...field}
                                    value={field.value ?? ''}
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                {/* Submit */}
                <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoggingIn}
                    aria-label="Sign in"
                >
                    {isLoggingIn
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Signing in...</>
                        : 'Sign In'
                    }
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Link
                        to="/register"
                        className="text-primary underline-offset-4 hover:underline"
                    >
                        Register
                    </Link>
                </p>
            </form>
        </Form>
    )
}
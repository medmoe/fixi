import React from 'react'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {Link} from 'react-router-dom'
import {Loader2} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {type LoginFormValues, createLoginSchema} from '../schemas/authSchema'
import {useAuth} from '@/features/auth'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {PasswordInput} from '@/components/ui/password-input'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from '@/components/ui/form'

export const LoginForm: React.FC = () => {
    const {t} = useTranslation('auth')
    const {login, isLoggingIn} = useAuth()

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(createLoginSchema(t)),
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
                aria-label={t('login.formAriaLabel')}
            >
                {/* Username or Email */}
                <FormField
                    control={form.control}
                    name="username_or_email"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel htmlFor="username-or-email">
                                {t('login.usernameOrEmailLabel')}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    id="username-or-email"
                                    type="text"
                                    placeholder={t('login.usernameOrEmailPlaceholder')}
                                    autoComplete="username"
                                    aria-label={t('login.usernameOrEmailAriaLabel')}
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
                                {t('login.passwordLabel')}
                            </FormLabel>
                            <FormControl>
                                <PasswordInput
                                    id="login-password"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    aria-label={t('login.passwordAriaLabel')}
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
                    aria-label={t('login.submitAriaLabel')}
                >
                    {isLoggingIn
                        ? <><Loader2 className="me-2 h-4 w-4 animate-spin"/> {t('login.signingIn')}</>
                        : t('login.signIn')
                    }
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    {t('login.noAccount')}{' '}
                    <Link
                        to="/register"
                        className="text-primary underline-offset-4 hover:underline"
                    >
                        {t('login.register')}
                    </Link>
                </p>
            </form>
        </Form>
    )
}
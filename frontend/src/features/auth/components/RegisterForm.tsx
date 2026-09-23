import React from 'react'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {Link} from 'react-router-dom'
import {Loader2} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {type RegisterFormValues, createRegisterSchema} from '../schemas/authSchema'
import {useRegister} from '@/features/auth/hooks/useRegister'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {PasswordInput} from '@/components/ui/password-input'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from '@/components/ui/form'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select'

export const RegisterForm: React.FC = () => {
    const {t} = useTranslation('auth')
    const {mutate: register, isPending} = useRegister()

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(createRegisterSchema(t)),
        defaultValues: {
            name: '',
            username: '',
            email: '',
            password: '',
            role_type: 'customer',
        },
    })

    const onSubmit = (values: RegisterFormValues) => {
        register(values)
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
                aria-label={t('register.formAriaLabel')}
                noValidate // bypass browser validation since we are using zod validation.
            >
                {/* Name */}
                <FormField
                    control={form.control}
                    name="name"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel htmlFor="register-name">{t('register.nameLabel')}</FormLabel>
                            <FormControl>
                                <Input
                                    id="register-name"
                                    type="text"
                                    placeholder="John Doe"
                                    autoComplete="name"
                                    aria-label={t('register.nameAriaLabel')}
                                    {...field}
                                    value={field.value ?? ''}
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                {/* Username */}
                <FormField
                    control={form.control}
                    name="username"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel htmlFor="register-username">{t('register.usernameLabel')}</FormLabel>
                            <FormControl>
                                <Input
                                    id="register-username"
                                    type="text"
                                    placeholder="john_doe"
                                    autoComplete="username"
                                    aria-label={t('register.usernameAriaLabel')}
                                    {...field}
                                    value={field.value ?? ''}
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                {/* Email */}
                <FormField
                    control={form.control}
                    name="email"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel htmlFor="register-email">{t('register.emailLabel')}</FormLabel>
                            <FormControl>
                                <Input
                                    id="register-email"
                                    type="email"
                                    placeholder="john@example.com"
                                    autoComplete="email"
                                    aria-label={t('register.emailAriaLabel')}
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
                            <FormLabel htmlFor="register-password">{t('register.passwordLabel')}</FormLabel>
                            <FormControl>
                                <PasswordInput
                                    id="register-password"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    aria-label={t('register.passwordAriaLabel')}
                                    {...field}
                                    value={field.value ?? ''}
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                {/* Role */}
                <FormField
                    control={form.control}
                    name="role_type"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>{t('register.roleLabel')}</FormLabel>
                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                            >
                                <FormControl>
                                    <SelectTrigger aria-label={t('register.roleAriaLabel')}>
                                        <SelectValue placeholder={t('register.rolePlaceholder')}/>
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="customer">
                                        {t('register.roleCustomer')}
                                    </SelectItem>
                                    <SelectItem value="worker">
                                        {t('register.roleWorker')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                {/* Submit */}
                <Button
                    type="submit"
                    className="w-full"
                    disabled={isPending}
                    aria-label={t('register.submitAriaLabel')}
                >
                    {isPending
                        ? <><Loader2 className="me-2 h-4 w-4 animate-spin"/> {t('register.creatingAccount')}</>
                        : t('register.createAccount')
                    }
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    {t('register.haveAccount')}{' '}
                    <Link
                        to="/login"
                        className="text-primary underline-offset-4 hover:underline"
                    >
                        {t('register.signIn')}
                    </Link>
                </p>
            </form>
        </Form>
    )
}

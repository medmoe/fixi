import React from 'react'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {Link} from 'react-router-dom'
import {Loader2} from 'lucide-react'
import {type RegisterFormValues, registerSchema} from '../schemas/authSchema'
import {useRegister} from '@/features/auth/hooks/useRegister'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from '@/components/ui/form'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select'

export const RegisterForm: React.FC = () => {
    const {mutate: register, isPending} = useRegister()

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
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
                aria-label="Registration form"
                noValidate // bypass browser validation since we are using zod validation.
            >
                {/* Name */}
                <FormField
                    control={form.control}
                    name="name"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel htmlFor="register-name">Full Name</FormLabel>
                            <FormControl>
                                <Input
                                    id="register-name"
                                    type="text"
                                    placeholder="John Doe"
                                    autoComplete="name"
                                    aria-label="Full name"
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
                            <FormLabel htmlFor="register-username">Username</FormLabel>
                            <FormControl>
                                <Input
                                    id="register-username"
                                    type="text"
                                    placeholder="john_doe"
                                    autoComplete="username"
                                    aria-label="Username"
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
                            <FormLabel htmlFor="register-email">Email</FormLabel>
                            <FormControl>
                                <Input
                                    id="register-email"
                                    type="email"
                                    placeholder="john@example.com"
                                    autoComplete="email"
                                    aria-label="Email address"
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
                            <FormLabel htmlFor="register-password">Password</FormLabel>
                            <FormControl>
                                <Input
                                    id="register-password"
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    aria-label="Password"
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
                            <FormLabel>I want to join as</FormLabel>
                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                            >
                                <FormControl>
                                    <SelectTrigger aria-label="Select role">
                                        <SelectValue placeholder="Select a role"/>
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="customer">
                                        Customer — I need services
                                    </SelectItem>
                                    <SelectItem value="worker">
                                        Worker — I offer services
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
                    aria-label="Create account"
                >
                    {isPending
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Creating account...</>
                        : 'Create Account'
                    }
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link
                        to="/login"
                        className="text-primary underline-offset-4 hover:underline"
                    >
                        Sign in
                    </Link>
                </p>
            </form>
        </Form>
    )
}
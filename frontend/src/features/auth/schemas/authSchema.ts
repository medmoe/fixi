import { z } from 'zod'

const RoleType = {
  customer: "customer",
  worker: "worker",
} as const;

export const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(/^[a-z][a-z0-9_]{1,19}$/, 'Username must start with a letter and contain only lowercase letters, numbers, or underscores'),
    email: z.email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(120, 'Password must be at most 120 characters')
        .refine((val) => /[0-9]/.test(val), 'Password must contain at least one digit')
        .refine((val) => /[A-Z]/.test(val), 'Password must contain at least one capital letter')
        .refine((val) => /[^a-zA-Z0-9]/.test(val), 'Password must contain at least one special character'),
    role_type: z.enum(RoleType),
})

export const loginSchema = z.object({
    username_or_email: z.string().min(1, 'Username or email is required'),
    password: z.string().min(1, 'Password is required'),
})

export type RegisterFormValues = z.infer<typeof registerSchema>
export type LoginFormValues = z.infer<typeof loginSchema>
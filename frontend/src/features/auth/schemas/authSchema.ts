import {z} from 'zod'
import type {TFunction} from 'i18next'

const RoleType = {
    customer: "customer",
    worker: "worker",
} as const;

export const createRegisterSchema = (t: TFunction) => z.object({
    name: z.string().min(2, t('validation.nameMinLength')).trim(),
    username: z
        .string()
        .min(3, t('validation.usernameMinLength'))
        .max(20, t('validation.usernameMaxLength'))
        .regex(/^[a-z][a-z0-9_]{1,19}$/, t('validation.usernamePattern')),
    email: z.email(t('validation.invalidEmail')),
    password: z
        .string()
        .min(8, t('validation.passwordMinLength'))
        .max(120, t('validation.passwordMaxLength'))
        .refine((val) => /[0-9]/.test(val), t('validation.passwordDigit'))
        .refine((val) => /[A-Z]/.test(val), t('validation.passwordCapital'))
        .refine((val) => /[^a-zA-Z0-9]/.test(val), t('validation.passwordSpecial')),
    role_type: z.enum(RoleType),
})

export const createLoginSchema = (t: TFunction) => z.object({
    username_or_email: z.string().min(1, t('validation.usernameOrEmailRequired')),
    password: z.string().min(1, t('validation.passwordRequired')),
})

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>
export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>

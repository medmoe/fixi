import {z} from 'zod'

export const NOT_GEOCODED_MESSAGE = "Select a location from the suggestions"

export const userUpdateSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be at most 100 characters'),
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(
            /^[a-z][a-z0-9_]{1,19}$/,
            'Username must start with a letter and contain only lowercase letters, numbers, or underscores'
        ),
    email: z.email('Invalid email address'),
    // Location is geocoded: the label and its coordinates travel together, and the
    // UI only ever sets them from an OpenStreetMap suggestion. See the refine below.
    display_location: z
        .string()
        .max(255, 'Location must be at most 255 characters')
        .optional()
        .nullable(),
    latitude: z
        .number('Latitude must be between -90 and 90')
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90')
        .optional()
        .nullable(),
    longitude: z
        .number('Longitude must be between -180 and 180')
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180')
        .optional()
        .nullable(),
    profile_image_url: z
        .url()
        .max(500, 'URL must be at most 500 characters')
        .optional()
        .or(z.literal(''))
        .nullable(),
})
    // All three or none: the backend stores them as a single PostGIS point, and
    // rejecting a half-filled set here is what stops ungeocodable free text from
    // ever being submitted.
    .superRefine((values, ctx) => {
        const hasLabel = typeof values.display_location === 'string' && values.display_location.length > 0
        const hasLatitude = typeof values.latitude === 'number'
        const hasLongitude = typeof values.longitude === 'number'

        if (hasLabel && hasLatitude && hasLongitude) return
        if (!hasLabel && !hasLatitude && !hasLongitude) return

        ctx.addIssue({
            code: 'custom',
            path: ['display_location'],
            message: NOT_GEOCODED_MESSAGE,
        })
    })

export type UserUpdateFormValues = z.infer<typeof userUpdateSchema>

export const userPasswordSchema = z
    .object({
        current_password: z
            .string()
            .min(1, 'Current password is required'),
        new_password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .max(120, 'Password must be at most 120 characters')
            .regex(/[0-9]/, 'Password must contain at least one digit')
            .regex(/[A-Z]/, 'Password must contain at least one capital letter')
            .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
        confirm_password: z.string().min(1, 'Please confirm your new password'),
    })
    .refine((data) => data.new_password === data.confirm_password, {
        message: 'Passwords do not match',
        path: ['confirm_password'],
    })

export type UserPasswordFormValues = z.infer<typeof userPasswordSchema>
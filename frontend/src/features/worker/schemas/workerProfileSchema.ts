import {z} from 'zod';

export const workerProfileSchema = z.object({
    bio: z
        .string()
        .max(500, {message: 'Bio must be less than 500 characters'})
        .optional()
        .or(z.literal('')),
    hourly_rate: z
        .coerce
        .number()
        .positive({message: 'Hourly rate must be greater than 0'})
        .multipleOf(0.01, {message: 'Hourly rate can have a maximum of 2 decimal places'})
        .optional(),
    service_radius_km: z
        .coerce
        .number()
        .int({message: 'Radius must be a whole number'})
        .min(1, {message: 'Radius must be greater than 0'})
        .max(500, {message: 'Radius must be less than 500 km'})
        .optional(),
    trades: z
        .array(
            z.object({
                trade_id: z.number(),
                skill_level: z.enum(['junior', 'mid', 'senior']),
            })
        )
        .max(5, {message: 'You can select up to 5 trades maximum'})
});

export type WorkerProfileFormValues = z.infer<typeof workerProfileSchema>;
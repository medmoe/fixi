import { z } from 'zod';

export const workerProfileSchema = z.object({
  bio: z
    .string()
    .max(500, { message: "Bio cannot exceed 500 characters" })
    .optional()
    .or(z.literal('')),

  // Use a cleaner definition or let Zod know these are numbers or undefined inputs
  hourly_rate: z
    .preprocess(
      (val) => (val === '' || val === undefined ? undefined : Number(val)),
      z.number().positive({ message: "Hourly rate must be greater than 0" })
    )
    .optional(),

  service_radius_km: z
    .preprocess(
      (val) => (val === '' || val === undefined ? undefined : Number(val)),
      z.number().int().min(1).max(500)
    )
    .optional(),

  trades: z
    .array(
      z.object({
        trade_id: z.number(),
        skill_level: z.enum(['junior', 'mid', 'senior']),
      })
    )
    .max(5, { message: "You can select up to 5 trades maximum" })
});

// CRUCIAL: Use z.input to extract the correct Type shape expected by React Hook Form's resolver
export type WorkerProfileFormValues = z.input<typeof workerProfileSchema>;
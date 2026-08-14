import {z} from 'zod'

const jobBaseSchema = z.object({
    title: z
        .string()
        .min(1, 'Title must be at least 1 character long')
        .max(255, 'Title must be at most 255 characters long'),

    description: z.string().optional(),
    trade_category_id: z.number().positive('Trade category ID must be positive').optional(),
    budget_min: z.number().min(0, 'Budget min must be non-negative').optional(),
    budget_max: z.number().min(0, 'Budget max must be non-negative').optional(),
    display_location: z.string().max(255, 'Display location must be at most 255 characters long').optional(),
});

export const jobPostSchema = jobBaseSchema.extend({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
}).refine(
    (data) => {
        if (data.budget_min !== undefined && data.budget_max !== undefined) {
            return data.budget_min <= data.budget_max;
        }
        return true;
    },
    {message: "Budget max must be greater than or equal to budget min.", path: ["budget_max"]}
);

export const jobUpdateSchema = jobBaseSchema.extend({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
}).refine(
    (data) => {
        if (data.budget_min !== undefined && data.budget_max !== undefined) {
            return data.budget_min <= data.budget_max;
        }
        return true;
    },
    {message: "Budget max must be greater than or equal to budget min.", path: ["budget_max"]}
);

export type JobPostFormValues = z.input<typeof jobPostSchema>;
export type JobUpdateFormValues = z.input<typeof jobUpdateSchema>;
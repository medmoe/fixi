// DescriptionField.tsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

export const DescriptionField: React.FC = () => {
    const { control, watch } = useFormContext();
    const descriptionValue = watch('description') || '';

    return (
        <FormField
            control={control}
            name="description"
            render={({ field }) => (
                <FormItem>
                    <div className="flex justify-between items-center">
                        <FormLabel htmlFor="job-description">Description</FormLabel>
                        <span
                            className={`text-xs ${descriptionValue.length > 1000 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}
                            aria-live="polite"
                        >
                            {descriptionValue.length}/1000 chars
                        </span>
                    </div>
                    <FormControl>
                        <Textarea
                            id="job-description"
                            placeholder="Describe the job in detail — what needs to be done, any access requirements, urgency..."
                            className="resize-none h-32"
                            aria-label="Job Description"
                            {...field}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
};
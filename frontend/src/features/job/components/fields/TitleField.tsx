// TitleField.tsx
import React from 'react';
import {useFormContext} from 'react-hook-form';
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';

export const TitleField: React.FC = () => {
    const {control, watch} = useFormContext();
    const titleValue = watch('title') || '';

    return (
        <FormField
            control={control}
            name="title"
            render={({field}) => (
                <FormItem>
                    <div className="flex justify-between items-center">
                        <FormLabel htmlFor="job-title">Job Title</FormLabel>
                        <span
                            className={`text-xs ${titleValue.length > 255 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}
                            aria-live="polite"
                        >
                            {titleValue.length}/255 chars
                        </span>
                    </div>
                    <FormControl>
                        <Input
                            id="job-title"
                            placeholder="e.g. Fix leaking kitchen sink, Install ceiling fan..."
                            aria-label="Job Title"
                            {...field}
                        />
                    </FormControl>
                    <FormMessage/>
                </FormItem>
            )}
        />
    );
};
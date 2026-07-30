import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

export const BioField: React.FC = () => {
  const { control, watch } = useFormContext();
  const bioValue = watch('bio') || '';

  return (
    <FormField
      control={control}
      name="bio"
      render={({ field }) => (
        <FormItem>
          <div className="flex justify-between items-center">
            <FormLabel htmlFor="worker-bio">Professional Bio</FormLabel>
            <span
              className={`text-xs ${bioValue.length > 500 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}
              aria-live="polite"
            >
              {bioValue.length}/500 chars
            </span>
          </div>
          <FormControl>
            <Textarea
              id="worker-bio"
              placeholder="Tell clients about your expertise, machinery ownership, and experience..."
              className="resize-none h-32"
              aria-label="Bio"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
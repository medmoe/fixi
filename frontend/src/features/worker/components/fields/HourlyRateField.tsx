import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input.tsx';

export const HourlyRateField: React.FC = () => {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name="hourly_rate"
      render={({ field }) => (
        <FormItem>
          <FormLabel htmlFor="hourly-rate-input">Hourly Rate</FormLabel>
          <FormControl>
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-muted-foreground sm:text-sm">$</span>
              </div>
              <Input
                id="hourly-rate-input"
                type="number"
                step="0.01"
                min="0.01"
                className="pl-7"
                placeholder="0.00"
                aria-label="Hourly rate"
                {...field}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-muted-foreground sm:text-sm">/ hr</span>
              </div>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '../../../../components/ui/form';
import { Slider } from '@/components/ui/slider.tsx';

export const ServiceRadiusField: React.FC = () => {
  const { control, watch, setValue } = useFormContext();
  const radius = watch('service_radius_km') || 25;

  return (
    <FormField
      control={control}
      name="service_radius_km"
      render={() => (
        <FormItem>
          <div className="flex justify-between items-center">
            <FormLabel>Service Radius</FormLabel>
            <span className="text-sm font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              {radius} km
            </span>
          </div>
          <FormControl>
            <div className="pt-2">
              <Slider
                min={1}
                max={500}
                step={1}
                value={[radius]}
                onValueChange={(vals) => setValue('service_radius_km', vals[0], { shouldDirty: true, shouldValidate: true })}
                aria-label="Service radius"
                aria-valuemin={1}
                aria-valuemax={500}
                aria-valuenow={radius}
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
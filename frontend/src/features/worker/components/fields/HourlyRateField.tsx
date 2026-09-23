import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input.tsx';

export const HourlyRateField: React.FC = () => {
  const {t} = useTranslation('worker');
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name="hourly_rate"
      render={({ field }) => (
        <FormItem>
          <FormLabel htmlFor="hourly-rate-input">{t('hourlyRateField.label')}</FormLabel>
          <FormControl>
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                <span className="text-muted-foreground sm:text-sm">$</span>
              </div>
              <Input
                id="hourly-rate-input"
                type="number"
                step="0.01"
                min="0.01"
                className="ps-7"
                placeholder="0.00"
                aria-label={t('hourlyRateField.ariaLabel')}
                {...field}
              />
              <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
                <span className="text-muted-foreground sm:text-sm">{t('hourlyRateField.perHourSuffix')}</span>
              </div>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

export const BioField: React.FC = () => {
  const {t} = useTranslation('worker');
  const { control, watch } = useFormContext();
  const bioValue = watch('bio') || '';

  return (
    <FormField
      control={control}
      name="bio"
      render={({ field }) => (
        <FormItem>
          <div className="flex justify-between items-center">
            <FormLabel htmlFor="worker-bio">{t('bioField.label')}</FormLabel>
            <span
              className={`text-xs ${bioValue.length > 500 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}
              aria-live="polite"
            >
              {t('bioField.charCount', {count: bioValue.length})}
            </span>
          </div>
          <FormControl>
            <Textarea
              id="worker-bio"
              placeholder={t('bioField.placeholder')}
              className="resize-none h-32"
              aria-label={t('bioField.ariaLabel')}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

// DescriptionField.tsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

export const DescriptionField: React.FC = () => {
    const {t} = useTranslation('job');
    const { control, watch } = useFormContext();
    const descriptionValue = watch('description') || '';

    return (
        <FormField
            control={control}
            name="description"
            render={({ field }) => (
                <FormItem>
                    <div className="flex justify-between items-center">
                        <FormLabel htmlFor="job-description">{t('descriptionField.label')}</FormLabel>
                        <span
                            className={`text-xs ${descriptionValue.length > 1000 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}
                            aria-live="polite"
                        >
                            {t('descriptionField.charCount', {count: descriptionValue.length})}
                        </span>
                    </div>
                    <FormControl>
                        <Textarea
                            id="job-description"
                            placeholder={t('descriptionField.placeholder')}
                            className="resize-none h-32"
                            aria-label={t('descriptionField.ariaLabel')}
                            {...field}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
};

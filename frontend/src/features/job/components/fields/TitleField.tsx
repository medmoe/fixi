// TitleField.tsx
import React from 'react';
import {useFormContext} from 'react-hook-form';
import {useTranslation} from 'react-i18next';
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';

export const TitleField: React.FC = () => {
    const {t} = useTranslation('job');
    const {control, watch} = useFormContext();
    const titleValue = watch('title') || '';

    return (
        <FormField
            control={control}
            name="title"
            render={({field}) => (
                <FormItem>
                    <div className="flex justify-between items-center">
                        <FormLabel htmlFor="job-title">{t('titleField.label')}</FormLabel>
                        <span
                            className={`text-xs ${titleValue.length > 255 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}
                            aria-live="polite"
                        >
                            {t('titleField.charCount', {count: titleValue.length})}
                        </span>
                    </div>
                    <FormControl>
                        <Input
                            id="job-title"
                            placeholder={t('titleField.placeholder')}
                            aria-label={t('titleField.label')}
                            {...field}
                        />
                    </FormControl>
                    <FormMessage/>
                </FormItem>
            )}
        />
    );
};

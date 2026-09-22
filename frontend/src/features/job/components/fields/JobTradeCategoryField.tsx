import React from 'react';
import {useFormContext} from 'react-hook-form';
import {useTranslation} from 'react-i18next';
import {Plus, X} from 'lucide-react';
import {FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Button} from '@/components/ui/button';
import {useTrades} from '@/features/worker/hooks/useTrades';
import type {TradeCategoryRead} from '@/features/worker';

export const JobTradeCategoryField: React.FC = () => {
    const {t} = useTranslation('job');
    const {control, setValue, watch} = useFormContext();
    const {data: availableTrades = [], isLoading} = useTrades();
    const selectedId: number | undefined = watch('trade_category_id');

    const selectedTrade = (availableTrades as TradeCategoryRead[]).find(
        (trade) => trade.id === selectedId
    );

    const handleSelect = (id: number) => {
        setValue('trade_category_id', id, {shouldDirty: true, shouldValidate: true});
    };

    const handleClear = () => {
        setValue('trade_category_id', undefined, {shouldDirty: true, shouldValidate: true});
    };

    if (isLoading) {
        return (
            <div className="text-sm text-muted-foreground animate-pulse">
                {t('jobTradeCategoryField.loading')}
            </div>
        );
    }

    return (
        <FormField
            control={control}
            name="trade_category_id"
            render={() => (
                <FormItem>
                    <FormLabel>{t('jobTradeCategoryField.label')}</FormLabel>

                    {/* Selected trade */}
                    {selectedTrade && (
                        <div className="flex items-center justify-between p-3 bg-accent/40 rounded-lg border border-border mb-2">
                            <span className="text-sm font-medium">
                                {selectedTrade.display_name ?? selectedTrade.name}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleClear}
                                aria-label={t('jobTradeCategoryField.removeAriaLabel', {name: selectedTrade.display_name ?? selectedTrade.name})}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                                <X className="h-4 w-4"/>
                            </Button>
                        </div>
                    )}

                    {/* Selectable trades */}
                    {!selectedTrade && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {(availableTrades as TradeCategoryRead[]).map((trade) => (
                                <Button
                                    key={trade.id}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSelect(trade.id)}
                                    className="text-xs flex items-center gap-1"
                                >
                                    <Plus className="h-3 w-3"/>
                                    {trade.display_name ?? trade.name}
                                </Button>
                            ))}
                        </div>
                    )}

                    <FormMessage/>
                </FormItem>
            )}
        />
    );
};

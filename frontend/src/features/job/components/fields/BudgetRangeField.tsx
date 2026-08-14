// BudgetRangeField.tsx
import React from 'react';
import {useFormContext} from 'react-hook-form';
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';

export const BudgetRangeField: React.FC = () => {
    const {control} = useFormContext();

    return (
        <div className="flex flex-col gap-2">
            <FormLabel>Budget Range</FormLabel>
            <div className="flex items-center gap-3">
                <FormField
                    control={control}
                    name="budget_min"
                    render={({field}) => (
                        <FormItem className="flex-1">
                            <FormLabel htmlFor="budget-min" className="text-xs text-muted-foreground">
                                Min ($)
                            </FormLabel>
                            <FormControl>
                                <Input
                                    id="budget-min"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    aria-label="Minimum budget"
                                    {...field}
                                    onChange={(e) => {
                                        const value = e.target.valueAsNumber;
                                        field.onChange(isNaN(value) ? undefined : value);
                                    }}
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
                <span className="text-muted-foreground mt-6">—</span>
                <FormField
                    control={control}
                    name="budget_max"
                    render={({field}) => (
                        <FormItem className="flex-1">
                            <FormLabel htmlFor="budget-max" className="text-xs text-muted-foreground">
                                Max ($)
                            </FormLabel>
                            <FormControl>
                                <Input
                                    id="budget-max"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    aria-label="Maximum budget"
                                    {...field}
                                    onChange={(e) => {
                                        const value = e.target.valueAsNumber
                                        field.onChange(isNaN(value) ? undefined : value)
                                    }}
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
};
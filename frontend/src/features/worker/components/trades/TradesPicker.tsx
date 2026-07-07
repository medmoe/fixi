import React from 'react';
import {useFieldArray, useFormContext} from 'react-hook-form';
import {useTrades} from '../../hooks/useTrades';
import {SkillLevelSelect} from './SkillLevelSelect';
import {Badge} from '../../../../components/ui/badge';
import {Button} from '../../../../components/ui/button';
import {FormItem, FormLabel, FormMessage} from '../../../../components/ui/form';
import {Plus, X} from 'lucide-react';
import {SkillLevel} from '../../types/worker.types';

export const TradesPicker: React.FC = () => {
    const {control} = useFormContext();
    const {data: availableTrades = [], isLoading} = useTrades();

    const {fields, append, remove} = useFieldArray({
        control,
        name: "trades",
        keyName: "_field_id"
    });

    const MAX_TRADES = 5;
    const selectedTradeIds = fields.map((f: any) => f.trade_id);

    const handleAddTrade = (tradeId: number) => {
        if (fields.length >= MAX_TRADES) return;
        append({trade_id: tradeId, skill_level: 'mid' as SkillLevel});
    };

    if (isLoading) return <div className="text-sm text-muted-foreground animate-pulse">Loading core trades database mappings...</div>;

    return (
        <FormItem className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <FormLabel className="text-base">Trades & Specializations</FormLabel>
                    <p className="text-xs text-muted-foreground">Select up to {MAX_TRADES} primary trades you operate within.</p>
                </div>
                <Badge variant={fields.length >= MAX_TRADES ? "destructive" : "secondary"}>
                    {fields.length}/{MAX_TRADES} Selected
                </Badge>
            </div>

            {/* Selected Items Array Workspace */}
            <div className="space-y-2 max-w-full">
                {fields.map((field: any, index) => {
                    const matchedStaticMeta = availableTrades.find(t => t.id === field.trade_id);
                    const tradeLabel = matchedStaticMeta?.name || `Unknown Trade (#${field.trade_id})`;

                    return (
                        <div
                            key={field._field_id}
                            className="flex items-center justify-between p-3 bg-accent/40 rounded-lg border border-border"
                        >
                            <span className="text-sm font-medium">{tradeLabel}</span>
                            <div className="flex items-center space-x-3">
                                <SkillLevelSelect
                                    value={field.skill_level}
                                    tradeName={tradeLabel}
                                    onChange={(newLevel) => {
                                        // Pulling direct contextual mutation via manual re-assignment handles nested field arrays safely
                                        const currentFields = [...control._formValues.trades];
                                        currentFields[index].skill_level = newLevel;
                                        control._setFieldArray("trades", currentFields);
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => remove(index)}
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    aria-label={`Remove trade allocation descriptor for ${tradeLabel}`}
                                >
                                    <X className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Available Trade Selection Matrix */}
            {fields.length < MAX_TRADES && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed">
                    {availableTrades
                        .filter(t => !selectedTradeIds.includes(t.id))
                        .map(trade => (
                            <Button
                                key={trade.id}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddTrade(trade.id)}
                                className="text-xs flex items-center gap-1"
                            >
                                <Plus className="h-3 w-3"/>
                                {trade.name}
                            </Button>
                        ))}
                </div>
            )}
            <FormMessage/>
        </FormItem>
    );
};
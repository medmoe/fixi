
import React from 'react'
import {Plus, X} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {useTrades} from '@/features/worker/hooks/useTrades'
import type {TradeCategoryRead, WorkerTradeNestedRead,} from '@/features/worker'

const MAX_TRADES = 5

interface TradeCategoryPickerProps {
    assignedTrades: WorkerTradeNestedRead[]
    pendingIds: number[]
    onPendingChange: (ids: number[]) => void
    onRemove: (trade_category_id: number) => void
    isRemoving: boolean
}

export const TradeCategoryPicker: React.FC<TradeCategoryPickerProps> = ({
                                                                            assignedTrades,
                                                                            pendingIds,
                                                                            onPendingChange,
                                                                            onRemove,
                                                                            isRemoving,
                                                                        }) => {
    const {t} = useTranslation('worker')
    const {data: availableTrades = [], isLoading} = useTrades()

    if (isLoading) {
        return (
            <div className="text-sm text-muted-foreground animate-pulse">
                {t('tradeCategoryPicker.loading')}
            </div>
        )
    }

    const assignedIds = assignedTrades.map((wt) => wt.trade_category_id)
    const totalSelected = assignedIds.length + pendingIds.length
    const atMax = totalSelected >= MAX_TRADES

    // trades not yet assigned and not pending
    const selectableTrades = (availableTrades as TradeCategoryRead[]).filter(
        (trade) => !assignedIds.includes(trade.id) && !pendingIds.includes(trade.id),
    )

    const handleAddPending = (id: number) => {
        if (atMax) return
        onPendingChange([...pendingIds, id])
    }

    const handleRemovePending = (id: number) => {
        onPendingChange(pendingIds.filter((p) => p !== id))
    }

    const pendingTrades = (availableTrades as TradeCategoryRead[]).filter(
        (trade) => pendingIds.includes(trade.id),
    )

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-base font-semibold">{t('tradeCategoryPicker.heading')}</p>
                    <p className="text-xs text-muted-foreground">
                        {t('tradeCategoryPicker.helperText', {max: MAX_TRADES})}
                    </p>
                </div>
                <Badge variant={atMax ? 'destructive' : 'secondary'}>
                    {t('tradeCategoryPicker.selectedCount', {count: totalSelected, max: MAX_TRADES})}
                </Badge>
            </div>

            {/* Assigned trades */}
            {assignedTrades.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        {t('tradeCategoryPicker.assignedHeading')}
                    </p>
                    {assignedTrades.map((wt) => {
                        const label =
                            wt.trade_category?.display_name ??
                            wt.trade_category?.name ??
                            t('tradeCategoryPicker.tradeFallback', {id: wt.trade_category_id})
                        return (
                            <div
                                key={wt.id}
                                className="flex items-center justify-between p-3 bg-accent/40 rounded-lg border border-border"
                            >
                                <span className="text-sm font-medium">{label}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={isRemoving}
                                    onClick={() => onRemove(wt.trade_category_id)}
                                    aria-label={t('tradeCategoryPicker.removeAriaLabel', {name: label})}
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                    <X className="h-4 w-4"/>
                                </Button>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Pending trades — selected but not saved yet */}
            {pendingTrades.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">
                        {t('tradeCategoryPicker.pendingHeading')}
                    </p>
                    {pendingTrades.map((trade) => (
                        <div
                            key={trade.id}
                            className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                        >
                            <span className="text-sm font-medium text-amber-800">
                                {trade.display_name ?? trade.name}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemovePending(trade.id)}
                                aria-label={t('tradeCategoryPicker.removeAriaLabel', {name: trade.display_name ?? trade.name})}
                                className="h-8 w-8 text-amber-600 hover:text-destructive"
                            >
                                <X className="h-4 w-4"/>
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Available trades to select */}
            {!atMax && selectableTrades.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed">
                    {selectableTrades.map((trade) => (
                        <Button
                            key={trade.id}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddPending(trade.id)}
                            className="text-xs flex items-center gap-1"
                        >
                            <Plus className="h-3 w-3"/>
                            {trade.display_name ?? trade.name}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    )
}

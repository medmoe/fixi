
import React from 'react'
import {Plus, X} from 'lucide-react'
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
    const {data: availableTrades = [], isLoading} = useTrades()

    if (isLoading) {
        return (
            <div className="text-sm text-muted-foreground animate-pulse">
                Loading trade categories...
            </div>
        )
    }

    const assignedIds = assignedTrades.map((t) => t.trade_category_id)
    const totalSelected = assignedIds.length + pendingIds.length
    const atMax = totalSelected >= MAX_TRADES

    // trades not yet assigned and not pending
    const selectableTrades = (availableTrades as TradeCategoryRead[]).filter(
        (t) => !assignedIds.includes(t.id) && !pendingIds.includes(t.id),
    )

    const handleAddPending = (id: number) => {
        if (atMax) return
        onPendingChange([...pendingIds, id])
    }

    const handleRemovePending = (id: number) => {
        onPendingChange(pendingIds.filter((p) => p !== id))
    }

    const pendingTrades = (availableTrades as TradeCategoryRead[]).filter(
        (t) => pendingIds.includes(t.id),
    )

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-base font-semibold">Trades & Specializations</p>
                    <p className="text-xs text-muted-foreground">
                        Select up to {MAX_TRADES} primary trades. Changes save on Update Profile.
                    </p>
                </div>
                <Badge variant={atMax ? 'destructive' : 'secondary'}>
                    {totalSelected}/{MAX_TRADES} Selected
                </Badge>
            </div>

            {/* Assigned trades */}
            {assignedTrades.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        Assigned
                    </p>
                    {assignedTrades.map((wt) => {
                        const label =
                            wt.trade_category?.display_name ??
                            wt.trade_category?.name ??
                            `Trade #${wt.trade_category_id}`
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
                                    aria-label={`Remove ${label}`}
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
                        Pending (save to confirm)
                    </p>
                    {pendingTrades.map((t) => (
                        <div
                            key={t.id}
                            className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                        >
                            <span className="text-sm font-medium text-amber-800">
                                {t.display_name ?? t.name}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemovePending(t.id)}
                                aria-label={`Remove ${t.display_name ?? t.name}`}
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
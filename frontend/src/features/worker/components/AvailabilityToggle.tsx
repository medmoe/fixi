import React from 'react';
import {useAvailabilityToggle} from '@/features/worker';
import {Switch} from '@/components/ui/switch.tsx';
import {Label} from '@/components/ui/label.tsx';

interface AvailabilityToggleProps {
    isAvailable: boolean;
}

export const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({isAvailable}) => {
    const {mutate: toggle, isPending} = useAvailabilityToggle();

    return (
        <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
                <Label htmlFor="availability-switch" className="text-sm font-medium cursor-pointer truncate block">
                    {isAvailable ? "Available for Work" : "Currently Offline"}
                </Label>
                <p className="text-xs text-muted-foreground">
                    {isAvailable
                        ? "Visible to clients in discovery"
                        : "Hidden from client searches"}
                </p>
            </div>
            <Switch
                id="availability-switch"
                checked={isAvailable}
                onCheckedChange={(checked) => toggle(checked)}
                disabled={isPending}
                aria-label="Availability toggle"
                aria-checked={isAvailable}
                data-testid="availability-switch"
            />
        </div>
    );
};
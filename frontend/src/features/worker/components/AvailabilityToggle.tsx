import React from 'react';
import { useAvailabilityToggle } from '../hooks/useAvailabilityToggle';
import { Switch } from '@/components/ui/switch.tsx';
import { Label } from '@/components/ui/label.tsx';

interface AvailabilityToggleProps {
  workerId: number;
  isAvailable: boolean;
}

export const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({ workerId, isAvailable }) => {
  const { mutate: toggle, isPending } = useAvailabilityToggle(workerId);

  return (
    <div className="flex items-center justify-between p-4 bg-card border rounded-xl shadow-sm">
      <div className="space-y-0.5">
        <Label htmlFor="availability-switch" className="text-base font-semibold cursor-pointer">
          Operations Dispatch State
        </Label>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full transition-colors duration-300 ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`}
            aria-hidden="true"
          />
          <span className="text-xs font-medium text-muted-foreground">
            {isAvailable ? "You are online & visible to discovery engines" : "You are offline (hidden from client maps)"}
          </span>
        </div>
      </div>
      <Switch
        id="availability-switch"
        checked={isAvailable}
        onCheckedChange={(checked) => toggle(checked)}
        disabled={isPending}
        aria-label="Availability toggle"
        aria-checked={isAvailable}
      />
    </div>
  );
};
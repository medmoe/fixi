import React from "react";
import {Badge} from "@/components/ui/badge";
import {CheckCircle2} from "lucide-react";
import type {WorkerProfileWithTradesRead} from "../types";

interface WorkerCardProps {
    worker: WorkerProfileWithTradesRead;
}

export const WorkerCard: React.FC<WorkerCardProps> = ({worker}) => (
    <div className="p-4 border rounded-lg space-y-2">
        <div className="flex items-center justify-between">
            <p className="font-medium">{worker.user.name}</p>
            {worker.is_verified && (
                <span title="Verified" className="text-primary">
                    <CheckCircle2 className="h-4 w-4"/>
                </span>
            )}
        </div>
        {worker.bio && <p className="text-sm text-muted-foreground line-clamp-2">{worker.bio}</p>}
        <div className="flex flex-wrap gap-1">
            {worker.trade_categories.map((wt) => (
                <Badge key={wt.id} variant="secondary" className="text-xs">
                    {wt.trade_category?.display_name}
                </Badge>
            ))}
        </div>
        <div className="flex items-center justify-between text-sm">
            {worker.hourly_rate && <span>${worker.hourly_rate}/hr</span>}
            <span className={worker.is_available ? "text-green-600" : "text-muted-foreground"}>
                {worker.is_available ? "Available" : "Unavailable"}
            </span>
        </div>
    </div>
);

export const WorkerSearchEmptyState: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium">No workers found</p>
        <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your filters to see more results.
        </p>
    </div>
);
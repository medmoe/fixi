import React from "react";
import {Skeleton} from "@/components/ui/skeleton";

export const WorkerCardSkeleton: React.FC = () => (
    <div className="p-4 border rounded-lg space-y-3" role="status" aria-label="Loading worker">
        <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full"/>
            <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/2"/>
                <Skeleton className="h-3 w-1/3"/>
            </div>
        </div>
        <Skeleton className="h-3 w-full"/>
        <Skeleton className="h-3 w-2/3"/>
    </div>
);

export const WorkerCardSkeletonGrid: React.FC<{ count?: number }> = ({count = 6}) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({length: count}).map((_, i) => (
            <WorkerCardSkeleton key={i}/>
        ))}
    </div>
);
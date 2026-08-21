import React from "react";
import {Skeleton} from "@/components/ui/skeleton";

export const WorkerCardSkeleton: React.FC = () => (
    <div
        role="status"
        aria-label="Loading worker profile"
        className="p-4 space-y-3 rounded-lg border h-full flex flex-col"
    >
        <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-full shrink-0"/>
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3"/>
                <Skeleton className="h-3 w-1/3"/>
            </div>
        </div>

        <div className="flex gap-1">
            <Skeleton className="h-5 w-16"/>
            <Skeleton className="h-5 w-20"/>
        </div>

        <Skeleton className="h-3 w-full"/>
        <Skeleton className="h-3 w-2/3"/>

        <div className="mt-auto flex justify-between pt-2 border-t">
            <Skeleton className="h-3 w-20"/>
            <Skeleton className="h-3 w-16"/>
        </div>
    </div>
);

export const WorkerCardSkeletonGrid: React.FC<{ count?: number }> = ({count = 6}) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({length: count}).map((_, i) => (
            <WorkerCardSkeleton key={i}/>
        ))}
    </div>
);
import React from "react";
import {MessageSquareText} from "lucide-react";

export const ReviewsEmptyState: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquareText className="size-10 text-muted-foreground/50" aria-hidden="true"/>
        <p className="mt-3 text-sm font-medium">No reviews yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
            Once this worker completes a job, reviews will show up here.
        </p>
    </div>
);

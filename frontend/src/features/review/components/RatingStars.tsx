import React from "react";
import {Star} from "lucide-react";
import {cn} from "@/lib/utils";

const STAR_POSITIONS = [1, 2, 3, 4, 5] as const;

interface RatingStarsProps {
    /** Average rating, e.g. 4.7. Rounded to the nearest half-star for display. */
    rating: number;
    size?: "sm" | "lg";
}

/** Read-only rating display — not an input. For the interactive 1-5 picker, see StarRating. */
export const RatingStars: React.FC<RatingStarsProps> = ({rating, size = "sm"}) => {
    const displayRating = Math.round(rating * 2) / 2;
    const sizeClass = size === "lg" ? "size-6" : "size-4";

    return (
        <div className="flex items-center gap-0.5 rtl:flex-row-reverse" aria-hidden="true">
            {STAR_POSITIONS.map((position) => {
                if (displayRating >= position) {
                    return <Star key={position} className={cn(sizeClass, "fill-yellow-400 text-yellow-400")}/>;
                }
                if (displayRating >= position - 0.5) {
                    return (
                        <span key={position} className={cn("relative inline-block", sizeClass)}>
                            <Star className={cn(sizeClass, "absolute inset-0 text-muted-foreground")}/>
                            <span className="absolute inset-0 w-1/2 overflow-hidden">
                                <Star className={cn(sizeClass, "fill-yellow-400 text-yellow-400")}/>
                            </span>
                        </span>
                    );
                }
                return <Star key={position} className={cn(sizeClass, "text-muted-foreground")}/>;
            })}
        </div>
    );
};

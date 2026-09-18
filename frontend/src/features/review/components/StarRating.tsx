import React, {useRef, useState} from "react";
import {Star} from "lucide-react";
import {cn} from "@/lib/utils";

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

interface StarRatingProps {
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({value, onChange, disabled}) => {
    const [hovered, setHovered] = useState<number | null>(null);
    const starRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const displayValue = hovered ?? value;
    // roving-tabindex target: the selected star, or the first star before
    // any selection has been made
    const activeValue = value || 1;

    const selectAndFocus = (nextValue: number) => {
        onChange(nextValue);
        starRefs.current[nextValue - 1]?.focus();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;
        if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            selectAndFocus(Math.min(5, activeValue + 1));
        } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault();
            selectAndFocus(Math.max(1, activeValue - 1));
        }
    };

    return (
        <div
            role="radiogroup"
            aria-label="Rating"
            // rtl:flex-row-reverse keeps the stars reading correctly once an
            // Arabic locale sets dir="rtl" on an ancestor (Phase 7 i18n) —
            // no locale detection needed here, Tailwind's rtl: variant
            // responds to the ambient `dir` automatically.
            className="flex items-center gap-1 rtl:flex-row-reverse"
            onMouseLeave={() => setHovered(null)}
        >
            {STAR_VALUES.map((starValue) => {
                const filled = starValue <= displayValue;
                return (
                    <button
                        key={starValue}
                        ref={(el) => {
                            starRefs.current[starValue - 1] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={value === starValue}
                        aria-label={`${starValue} star${starValue > 1 ? "s" : ""}`}
                        tabIndex={starValue === activeValue ? 0 : -1}
                        disabled={disabled}
                        onClick={() => onChange(starValue)}
                        onMouseEnter={() => setHovered(starValue)}
                        onKeyDown={handleKeyDown}
                        className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-yellow-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Star
                            aria-hidden="true"
                            className={cn("size-7", filled && "fill-yellow-400 text-yellow-400")}
                        />
                    </button>
                );
            })}
        </div>
    );
};

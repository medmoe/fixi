import React, {useEffect} from "react";
import {useTranslation} from "react-i18next";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {Dialog, DialogContent, DialogDescription, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import type {PortfolioImageRead} from "../types";

interface PortfolioLightboxProps {
    images: PortfolioImageRead[];
    /** Index of the open image, or null when closed. */
    index: number | null;
    onIndexChange: (index: number | null) => void;
}

/** Full-size viewer with previous/next. "Next" follows reading direction, so in RTL it sits on the left. */
export const PortfolioLightbox: React.FC<PortfolioLightboxProps> = ({images, index, onIndexChange}) => {
    const {t, i18n} = useTranslation("worker");
    const isOpen = index !== null && images[index] !== undefined;
    const count = images.length;

    const go = (delta: number) => {
        if (index === null || count === 0) return;
        onIndexChange((index + delta + count) % count);
    };

    useEffect(() => {
        if (!isOpen) return;
        const rtl = i18n.dir() === "rtl";
        const onKey = (e: KeyboardEvent) => {
            // Arrow keys follow the screen, so flip them in RTL where "next" is on the left.
            if (e.key === "ArrowRight") go(rtl ? -1 : 1);
            if (e.key === "ArrowLeft") go(rtl ? 1 : -1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onIndexChange(null)}>
            <DialogContent className="max-w-4xl p-2 sm:p-4">
                <DialogTitle className="sr-only">{t("portfolio.lightboxTitle")}</DialogTitle>
                <DialogDescription className="sr-only">
                    {isOpen && t("portfolio.position", {current: index + 1, total: count})}
                </DialogDescription>
                {isOpen && (
                    <div className="relative flex items-center justify-center">
                        <img
                            src={images[index].image_url}
                            alt={t("portfolio.imageAlt", {number: index + 1})}
                            className="max-h-[80vh] w-auto rounded-md object-contain"
                        />
                        {count > 1 && (
                            <>
                                <Button type="button" variant="secondary" size="icon" className="absolute start-2" onClick={() => go(-1)} aria-label={t("portfolio.previous")}>
                                    <ChevronLeft className="h-5 w-5 rtl:rotate-180"/>
                                </Button>
                                <Button type="button" variant="secondary" size="icon" className="absolute end-2" onClick={() => go(1)} aria-label={t("portfolio.next")}>
                                    <ChevronRight className="h-5 w-5 rtl:rotate-180"/>
                                </Button>
                            </>
                        )}
                    </div>
                )}
                {isOpen && count > 1 && (
                    <p className="text-center text-xs text-muted-foreground">{t("portfolio.position", {current: index + 1, total: count})}</p>
                )}
            </DialogContent>
        </Dialog>
    );
};

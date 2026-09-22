import React from "react";
import {useTranslation} from "react-i18next";
import {MessageSquareText} from "lucide-react";

export const ReviewsEmptyState: React.FC = () => {
    const {t} = useTranslation("review");

    return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquareText className="size-10 text-muted-foreground/50" aria-hidden="true"/>
        <p className="mt-3 text-sm font-medium">{t("reviewsEmptyState.heading")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
            {t("reviewsEmptyState.subtitle")}
        </p>
    </div>
    );
};

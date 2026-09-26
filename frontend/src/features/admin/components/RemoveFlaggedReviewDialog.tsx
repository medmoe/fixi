import React from "react";
import {useTranslation} from "react-i18next";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {Button} from "@/components/ui/button";

interface RemoveFlaggedReviewDialogProps {
    isPending: boolean;
    /** Disables the trigger, e.g. while another action on the same row is in flight. */
    disabled?: boolean;
    onConfirm: () => void;
}

export const RemoveFlaggedReviewDialog: React.FC<RemoveFlaggedReviewDialogProps> = ({isPending, disabled = false, onConfirm}) => {
    const {t} = useTranslation("admin");

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isPending || disabled}>
                    {t("flaggedReviews.removeButton")}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("flaggedReviews.removeConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("flaggedReviews.removeConfirmDescription")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t("flaggedReviews.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isPending ? t("flaggedReviews.saving") : t("flaggedReviews.removeButton")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

import React, {useState} from "react";
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
import {Textarea} from "@/components/ui/textarea";

interface SuspendUserDialogProps {
    mode: "suspend" | "reactivate";
    isPending: boolean;
    onConfirm: (reason?: string) => void;
}

export const SuspendUserDialog: React.FC<SuspendUserDialogProps> = ({mode, isPending, onConfirm}) => {
    const {t} = useTranslation("admin");
    const [reason, setReason] = useState("");

    const handleConfirm = () => {
        onConfirm(reason.trim() || undefined);
        setReason("");
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant={mode === "suspend" ? "destructive" : "default"}>
                    {mode === "suspend" ? t("detail.suspendButton") : t("detail.reactivateButton")}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {mode === "suspend" ? t("detail.suspendConfirmTitle") : t("detail.reactivateConfirmTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {mode === "suspend" ? t("detail.suspendConfirmDescription") : t("detail.reactivateConfirmDescription")}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <Textarea
                    aria-label={t("detail.reasonAriaLabel")}
                    placeholder={t("detail.reasonPlaceholder")}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />

                <AlertDialogFooter>
                    <AlertDialogCancel>{t("detail.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isPending}
                        className={mode === "suspend" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
                    >
                        {isPending
                            ? t("detail.saving")
                            : mode === "suspend"
                                ? t("detail.suspendButton")
                                : t("detail.reactivateButton")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

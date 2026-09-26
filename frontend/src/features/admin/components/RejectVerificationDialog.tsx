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

interface RejectVerificationDialogProps {
    isPending: boolean;
    onConfirm: (reason: string) => void;
}

export const RejectVerificationDialog: React.FC<RejectVerificationDialogProps> = ({isPending, onConfirm}) => {
    const {t} = useTranslation("admin");
    const [reason, setReason] = useState("");
    const trimmedReason = reason.trim();

    const handleConfirm = () => {
        if (!trimmedReason) return;
        onConfirm(trimmedReason);
        setReason("");
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    {t("verificationQueue.rejectButton")}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("verificationQueue.rejectConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("verificationQueue.rejectConfirmDescription")}</AlertDialogDescription>
                </AlertDialogHeader>

                <Textarea
                    aria-label={t("verificationQueue.reasonAriaLabel")}
                    placeholder={t("verificationQueue.reasonPlaceholder")}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />

                <AlertDialogFooter>
                    <AlertDialogCancel>{t("verificationQueue.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isPending || !trimmedReason}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isPending ? t("verificationQueue.saving") : t("verificationQueue.rejectButton")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

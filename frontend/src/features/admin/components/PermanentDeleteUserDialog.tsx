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
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";

interface PermanentDeleteUserDialogProps {
    username: string;
    isPending: boolean;
    onConfirm: (reason?: string) => void;
}

/** Irreversible delete, gated on typing the exact username. */
export const PermanentDeleteUserDialog: React.FC<PermanentDeleteUserDialogProps> = ({username, isPending, onConfirm}) => {
    const {t} = useTranslation("admin");
    const [typed, setTyped] = useState("");
    const [reason, setReason] = useState("");
    const matches = typed.trim() === username;

    const reset = () => {
        setTyped("");
        setReason("");
    };

    return (
        <AlertDialog onOpenChange={(open) => !open && reset()}>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">{t("permanentDelete.button")}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("permanentDelete.confirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-2">
                            <p>{t("permanentDelete.confirmDescription")}</p>
                            <ul className="list-disc ps-5 space-y-1">
                                <li>{t("permanentDelete.consequenceAccount")}</li>
                                <li>{t("permanentDelete.consequenceJobs")}</li>
                                <li>{t("permanentDelete.consequenceBilling")}</li>
                            </ul>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-2">
                    <label htmlFor="confirm-username" className="text-sm">
                        {t("permanentDelete.typeToConfirm", {username})}
                    </label>
                    <Input
                        id="confirm-username"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        dir="ltr"
                    />
                    <Textarea
                        aria-label={t("permanentDelete.reasonAriaLabel")}
                        placeholder={t("permanentDelete.reasonPlaceholder")}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel>{t("permanentDelete.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => onConfirm(reason.trim() || undefined)}
                        disabled={!matches || isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isPending ? t("permanentDelete.deleting") : t("permanentDelete.confirmButton")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

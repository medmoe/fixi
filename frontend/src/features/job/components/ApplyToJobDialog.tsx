import React, {useState} from "react";
import {AxiosError} from "axios";
import {Loader2, Send} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,} from "@/components/ui/dialog";
import {useApplyToJob} from "@/features/job";

interface ApplyToJobDialogProps {
    jobId: number;
    jobTitle: string;
    disabled?: boolean;
}

export const ApplyToJobDialog: React.FC<ApplyToJobDialogProps> = ({jobId, jobTitle, disabled}) => {
    const {t} = useTranslation("job");
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [hasApplied, setHasApplied] = useState(false);

    const {mutate: applyToJob, isPending} = useApplyToJob(jobId);

    const handleSubmit = () => {
        applyToJob(
            {message: message.trim() || undefined},
            {
                onSuccess: () => {
                    setHasApplied(true);
                    setOpen(false);
                    setMessage("");
                },
                onError: (error: AxiosError<{ detail: string }>) => {
                    // The backend enforces "already applied" and "job not
                    // OPEN" as 400s with distinct messages — toast display
                    // is handled generically in useApplyToJob's own onError.
                    // Here we additionally recognize the "already applied"
                    // case specifically, since it means the button should
                    // stop offering to apply again for the rest of this
                    // session, rather than letting the user retry into the
                    // same rejection repeatedly.
                    const detail = error.response?.data?.detail?.toLowerCase() ?? "";
                    if (detail.includes("already applied")) {
                        setHasApplied(true);
                        setOpen(false);
                    }
                    // "not OPEN" case (race condition — job status changed
                    // after this page loaded) is left as just a toast; the
                    // dialog stays open so the user can see their message
                    // was preserved, though the button remains enabled
                    // since `disabled` is driven by the possibly-stale
                    // `job.status` prop, not by this error.
                },
            }
        );
    };

    if (hasApplied) {
        return (
            <Button disabled className="w-full">
                {t("applyToJobDialog.applicationSubmitted")}
            </Button>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={disabled} className="w-full">
                    <Send className="me-2 h-4 w-4"/>
                    {t("applyToJobDialog.applyToThisJob")}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("applyToJobDialog.dialogTitle", {title: jobTitle})}</DialogTitle>
                    <DialogDescription>
                        {t("applyToJobDialog.dialogDescription")}
                    </DialogDescription>
                </DialogHeader>

                <Textarea
                    aria-label={t("applyToJobDialog.messageAriaLabel")}
                    placeholder={t("applyToJobDialog.messagePlaceholder")}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={1000}
                    className="min-h-32 resize-none"
                    disabled={isPending}
                />

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                        {t("shared.cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="me-2 h-4 w-4 animate-spin"/>
                                {t("applyToJobDialog.submitting")}
                            </>
                        ) : (
                            t("applyToJobDialog.submitApplication")
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

import React, {useState} from "react";
import {AxiosError} from "axios";
import {Loader2, Send} from "lucide-react";
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
                Application submitted
            </Button>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={disabled} className="w-full">
                    <Send className="mr-2 h-4 w-4"/>
                    Apply to this job
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Apply to &ldquo;{jobTitle}&rdquo;</DialogTitle>
                    <DialogDescription>
                        Add an optional message to introduce yourself to the customer.
                    </DialogDescription>
                </DialogHeader>

                <Textarea
                    aria-label="Application message"
                    placeholder="I have 5 years of experience and can start right away..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={1000}
                    className="min-h-32 resize-none"
                    disabled={isPending}
                />

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                Submitting...
                            </>
                        ) : (
                            "Submit application"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
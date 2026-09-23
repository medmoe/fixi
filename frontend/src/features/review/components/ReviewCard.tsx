import React, {useState} from "react";
import type {AxiosError} from "axios";
import {X} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {Card, CardAction, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Textarea} from "@/components/ui/textarea";
import {StarRating, useReviewStatus, useSubmitReview} from "@/features/review";

const MAX_COMMENT_LENGTH = 1000;

interface ReviewCardProps {
    jobId: number;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({jobId}) => {
    const {t} = useTranslation("review");
    const {data: eligibility, isLoading} = useReviewStatus(jobId);
    const {mutate: submitReview} = useSubmitReview(jobId);

    const [dismissed, setDismissed] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitError, setSubmitError] = useState<string | null>(null);

    if (dismissed || isLoading || !eligibility?.can_review) {
        return null;
    }

    const handleSubmit = () => {
        setSubmitError(null);
        // Optimistic UI — collapse to the confirmation state immediately,
        // before the request even resolves. On failure we revert below.
        setSubmitted(true);
        submitReview(
            {rating, comment: comment.trim() || undefined},
            {
                onError: (error: AxiosError<{ detail: string }>) => {
                    setSubmitted(false);
                    setSubmitError(error.response?.data?.detail ?? t("reviewCard.submitError"));
                },
            }
        );
    };

    if (submitted) {
        return (
            <Card>
                <CardContent className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium">{t("reviewCard.submitted")}</p>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDismissed(true)} aria-label={t("reviewCard.dismissAriaLabel")}>
                        <X className="size-4"/>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("reviewCard.heading")}</CardTitle>
                <CardAction>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDismissed(true)} aria-label={t("reviewCard.dismissAriaLabel")}>
                        <X className="size-4"/>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
                <StarRating value={rating} onChange={setRating}/>

                <div className="space-y-1">
                    <Textarea
                        aria-label={t("reviewCard.commentAriaLabel")}
                        placeholder={t("reviewCard.commentPlaceholder")}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={MAX_COMMENT_LENGTH}
                        className="min-h-24 resize-none"
                    />
                    <p aria-live="polite" className="text-right text-xs text-muted-foreground">
                        {comment.length}/{MAX_COMMENT_LENGTH}
                    </p>
                </div>

                {submitError && (
                    <p role="alert" className="text-sm text-destructive">
                        {submitError}
                    </p>
                )}

                <Button onClick={handleSubmit} disabled={rating === 0} className="w-full">
                    {t("reviewCard.submit")}
                </Button>
            </CardContent>
        </Card>
    );
};

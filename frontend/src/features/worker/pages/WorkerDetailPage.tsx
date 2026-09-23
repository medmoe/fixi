import React from "react";
import {Link, useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ArrowLeft, CheckCircle2, Clock, MapPin, Star} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Skeleton} from "@/components/ui/skeleton";
import {Button} from "@/components/ui/button";
import {Separator} from "@/components/ui/separator";
import {useWorkerProfilePublic} from "@/features/worker";
import {ReviewsSection} from "@/features/review";

const getInitials = (name: string): string =>
    name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

export const WorkerDetailPage: React.FC = () => {
    const {t} = useTranslation("worker");
    const { workerId } = useParams<{ workerId: string }>();
    const id = Number(workerId);

    const { data: profile, isLoading, isError } = useWorkerProfilePublic(id);

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto p-6 space-y-4" role="status" aria-label={t("shared.loadingWorkerProfile")}>
                <Skeleton className="h-8 w-32" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                    </div>
                </div>
                <Skeleton className="h-24 w-full" />
            </div>
        );
    }

    if (isError || !profile) {
        return (
            <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
                <p className="text-lg font-medium">{t("workerDetailPage.notFoundTitle")}</p>
                <p className="text-sm text-muted-foreground">
                    {t("workerDetailPage.notFoundDescription")}
                </p>
                <Button asChild variant="outline">
                    <Link to="/workers/search">{t("workerDetailPage.backToSearch")}</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <Button asChild variant="ghost" size="sm" className="-ms-2">
                <Link to="/workers/search">
                    <ArrowLeft className="me-1 h-4 w-4 rtl:rotate-180" />
                    {t("workerDetailPage.backToSearch")}
                </Link>
            </Button>

            {/* Header */}
            <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="text-lg">{getInitials(profile.user.name)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold">{profile.user.name}</h1>
                        {profile.is_verified && (
                            <span title={t("shared.verifiedWorker")}>
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Star className="h-4 w-4" aria-hidden="true" />
                        <span>
                            {profile.average_rating !== null
                                ? t("workerDetailPage.reviewCount", {rating: Number(profile.average_rating).toFixed(1), count: profile.review_count})
                                : t("shared.newRating")}
                        </span>
                        {profile.years_of_experience !== null && (
                            <span>{t("workerDetailPage.yearsExperience", {count: profile.years_of_experience})}</span>
                        )}
                    </div>

                    <span
                        className={`inline-block mt-2 text-sm font-medium ${
                            profile.is_available ? "text-green-600" : "text-muted-foreground"
                        }`}
                    >
                        {profile.is_available ? t("shared.availableNow") : t("workerDetailPage.currentlyUnavailable")}
                    </span>
                </div>
            </div>

            {/* Trade badges */}
            {profile.trade_categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {profile.trade_categories.map((wt) => (
                        <Badge key={wt.id} variant="secondary">
                            {wt.trade_category?.display_name}
                        </Badge>
                    ))}
                </div>
            )}

            {/* Bio */}
            {profile.bio && (
                <div>
                    <h2 className="text-sm font-medium mb-1">{t("workerDetailPage.aboutHeading")}</h2>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{profile.bio}</p>
                </div>
            )}

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                {profile.hourly_rate !== null && (
                    <div>
                        <p className="text-xs text-muted-foreground">{t("workerDetailPage.hourlyRateLabel")}</p>
                        <p className="font-medium">{t("workerDetailPage.hourlyRateValue", {rate: Number(profile.hourly_rate).toFixed(2)})}</p>
                    </div>
                )}
                {profile.service_radius_km !== null && (
                    <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {t("shared.serviceRadius")}
                        </p>
                        <p className="font-medium">{t("workerDetailPage.radiusValue", {radius: profile.service_radius_km})}</p>
                    </div>
                )}
                {profile.years_of_experience !== null && (
                    <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {t("workerDetailPage.experienceLabel")}
                        </p>
                        <p className="font-medium">{t("workerDetailPage.yearsSuffix", {count: profile.years_of_experience})}</p>
                    </div>
                )}
            </div>

            {/* Contact / request quote — placeholder for future ticket */}
            <div className="pt-4 border-t">
                <Button className="w-full" disabled>
                    {t("workerDetailPage.contactWorker")}
                </Button>
            </div>

            <Separator />
            <ReviewsSection workerProfileId={profile.id} />
        </div>
    );
};

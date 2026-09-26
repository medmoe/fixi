import React from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {CheckCircle2, MapPin, Star} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {useFormatCurrency, useFormatNumber} from "@/lib/hooks/useFormatters";
import {useLocalizedTradeName} from "../hooks/useLocalizedTradeName";
import type {WorkerProfileWithTradesRead} from "../types";

interface WorkerCardProps {
    profile: WorkerProfileWithTradesRead;
    distance_km?: number;
}

const getInitials = (name: string): string =>
    name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

export const WorkerCard: React.FC<WorkerCardProps> = ({profile, distance_km: distanceOverride}) => {
    const {t} = useTranslation("worker");
    // Geo searches return distance_km on the profile itself; the prop still wins if a caller passes one.
    const distance_km = distanceOverride ?? profile.distance_km ?? undefined;
    const formatCurrency = useFormatCurrency();
    const formatNumber = useFormatNumber();
    const getTradeName = useLocalizedTradeName();

    return (
        <Link
            to={`/workers/${profile.id}`}
            className="block overflow-hidden rounded-lg border hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            {/* Cover — the worker's first portfolio photo, when search returned one */}
            {profile.cover_image_url && (
                <img
                    src={profile.cover_image_url}
                    alt=""
                    loading="lazy"
                    data-testid="worker-card-cover"
                    className="h-32 w-full object-cover"
                />
            )}
            <article
                aria-label={t("workerCard.profileAriaLabel", {name: profile.user.name})}
                className="p-4 space-y-3 h-full flex flex-col"
            >
                {/* Header — avatar, name, verified badge */}
                <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 shrink-0">
                        <AvatarImage src={profile.avatar_url ?? undefined} alt=""/>
                        <AvatarFallback>{getInitials(profile.user.name)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="font-medium truncate">{profile.user.name}</p>
                            {profile.is_verified && (
                                <CheckCircle2
                                    className="h-4 w-4 text-primary shrink-0"
                                    aria-label={t("shared.verifiedWorker")}
                                />
                            )}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3" aria-hidden="true"/>
                            <span>
                                {profile.average_rating !== null
                                    ? `${formatNumber(Number(profile.average_rating), {minimumFractionDigits: 1, maximumFractionDigits: 1})} (${profile.review_count})`
                                    : t("shared.newRating")}
                            </span>
                            {profile.years_of_experience !== null && (
                                <span>{t("workerCard.yearsExp", {count: profile.years_of_experience})}</span>
                            )}
                        </div>
                    </div>

                    <span
                        className={`text-xs font-medium shrink-0 ${
                            profile.is_available ? "text-green-600" : "text-muted-foreground"
                        }`}
                    >
                        {profile.is_available ? t("workerCard.available") : t("workerCard.unavailable")}
                    </span>
                </div>

                {/* Trade badges */}
                {profile.trade_categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {profile.trade_categories.map((wt) => (
                            <Badge key={wt.id} variant="secondary" className="text-xs">
                                {getTradeName(wt.trade_category)}
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Bio */}
                {profile.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>
                )}

                {/* Footer — rate, radius, distance */}
                <div className="mt-auto flex items-center justify-between text-sm pt-2 border-t">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        {profile.hourly_rate !== null && <span>{t("workerCard.perHour", {rate: formatCurrency(Number(profile.hourly_rate))})}</span>}
                        {profile.service_radius_km !== null && (
                            <span>{t("workerCard.radiusSuffix", {radius: profile.service_radius_km})}</span>
                        )}
                    </div>

                    {distance_km !== undefined && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" aria-hidden="true"/>
                            {t("workerCard.distanceAway", {distance: formatNumber(distance_km, {minimumFractionDigits: 1, maximumFractionDigits: 1})})}
                        </span>
                    )}
                </div>
            </article>
        </Link>
    );
};

export const WorkerSearchEmptyState: React.FC = () => {
    const {t} = useTranslation("worker");

    return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium">{t("workerCard.noWorkersFound")}</p>
        <p className="text-sm text-muted-foreground mt-1">
            {t("workerCard.noWorkersHint")}
        </p>
    </div>
    );
};

import React from "react";
import {useTranslation} from "react-i18next";
import {Badge} from "@/components/ui/badge";

interface UserStatusBadgeProps {
    isSuspended: boolean;
}

export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({isSuspended}) => {
    const {t} = useTranslation("admin");

    return (
        <Badge variant={isSuspended ? "destructive" : "secondary"}>
            {isSuspended ? t("status.suspended") : t("status.active")}
        </Badge>
    );
};

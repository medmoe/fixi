import React from "react";
import {Link, useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {AlertCircle, ArrowLeft, Loader2} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {useAdminUserDetail} from "../hooks/useAdminUserDetail";
import {useSuspendUser} from "../hooks/useSuspendUser";
import {useReactivateUser} from "../hooks/useReactivateUser";
import {UserStatusBadge} from "../components/UserStatusBadge";
import {SuspendUserDialog} from "../components/SuspendUserDialog";
import {AdminAuditLogList} from "../components/AdminAuditLogList";

export const AdminUserDetailPage: React.FC = () => {
    const {t} = useTranslation("admin");
    const {userId} = useParams<{ userId: string }>();
    const id = Number(userId);

    const {user, isLoading, error, auditLog} = useAdminUserDetail(id);
    const suspendMutation = useSuspendUser(id);
    const reactivateMutation = useReactivateUser(id);

    if (isLoading) {
        return (
            <div className="flex h-64 w-full flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                <p className="text-sm font-medium text-muted-foreground">{t("detail.loading")}</p>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="mx-auto max-w-md my-12 border-destructive/50 bg-destructive/10 text-destructive rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5"/>
                <p className="text-sm">{t("detail.loadError")}</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-2xl">
            <Link to="/admin/users" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4 rtl:rotate-180"/>
                {t("detail.backToUsers")}
            </Link>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>{user.name}</CardTitle>
                        <UserStatusBadge isSuspended={user.is_suspended}/>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">{t("detail.username")}:</span> {user.username}</p>
                    <p><span className="text-muted-foreground">{t("detail.email")}:</span> {user.email}</p>
                    <p><span className="text-muted-foreground">{t("detail.role")}:</span> {t(`role.${user.role_type}`)}</p>

                    <div className="pt-4">
                        {user.is_suspended ? (
                            <SuspendUserDialog
                                mode="reactivate"
                                isPending={reactivateMutation.isPending}
                                onConfirm={(reason) => reactivateMutation.mutate(reason)}
                            />
                        ) : (
                            <SuspendUserDialog
                                mode="suspend"
                                isPending={suspendMutation.isPending}
                                onConfirm={(reason) => suspendMutation.mutate(reason)}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("detail.auditLogTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <AdminAuditLogList entries={auditLog}/>
                </CardContent>
            </Card>
        </div>
    );
};

import React from "react";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import type {UserRead} from "@/features/user";
import {UserStatusBadge} from "./UserStatusBadge";

interface AdminUserTableProps {
    users: UserRead[];
}

export const AdminUserTable: React.FC<AdminUserTableProps> = ({users}) => {
    const {t} = useTranslation("admin");

    return (
        <table className="w-full text-sm border-collapse">
            <thead>
            <tr className="border-b text-start text-muted-foreground">
                <th className="py-2 pe-4 font-medium text-start">{t("table.name")}</th>
                <th className="py-2 pe-4 font-medium text-start">{t("table.email")}</th>
                <th className="py-2 pe-4 font-medium text-start">{t("table.role")}</th>
                <th className="py-2 pe-4 font-medium text-start">{t("table.status")}</th>
                <th className="py-2 pe-4 font-medium text-start"/>
            </tr>
            </thead>
            <tbody>
            {users.map((user) => (
                <tr key={user.id} data-testid="admin-user-row" className="border-b last:border-0">
                    <td className="py-2 pe-4">{user.name}</td>
                    <td className="py-2 pe-4 text-muted-foreground">{user.email}</td>
                    <td className="py-2 pe-4">{t(`role.${user.role_type}`)}</td>
                    <td className="py-2 pe-4">
                        <UserStatusBadge isSuspended={user.is_suspended}/>
                    </td>
                    <td className="py-2 pe-4 text-end">
                        <Link to={`/admin/users/${user.id}`} className="text-primary hover:underline">
                            {t("table.view")}
                        </Link>
                    </td>
                </tr>
            ))}
            </tbody>
        </table>
    );
};

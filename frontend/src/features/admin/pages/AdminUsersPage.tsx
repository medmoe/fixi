import React from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {Loader2} from "lucide-react";
import {useAdminUsers} from "../hooks/useAdminUsers";
import {AdminUserFilterBar} from "../components/AdminUserFilterBar";
import {AdminUserTable} from "../components/AdminUserTable";

export const AdminUsersPage: React.FC = () => {
    const {t} = useTranslation("admin");
    const {
        filters,
        updateFilters,
        users,
        totalCount,
        hasMore,
        loadMore,
        isLoading,
        isFetchingNextPage,
        isError,
    } = useAdminUsers();

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-xl font-semibold">{t("usersPage.title")}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {isLoading ? t("usersPage.loading") : t("usersPage.usersFoundCount", {count: totalCount})}
                </p>
            </div>

            <AdminUserFilterBar filters={filters} onChange={updateFilters}/>

            {isError && <p className="text-sm text-destructive">{t("usersPage.loadError")}</p>}

            {isLoading && <p className="text-sm text-muted-foreground animate-pulse">{t("usersPage.loading")}</p>}

            {!isLoading && !isError && users.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("usersPage.emptyState")}</p>
            )}

            {!isLoading && !isError && users.length > 0 && (
                <>
                    <AdminUserTable users={users}/>

                    {hasMore && (
                        <div className="flex justify-center">
                            <Button variant="outline" onClick={() => loadMore()} disabled={isFetchingNextPage}>
                                {isFetchingNextPage ? (
                                    <>
                                        <Loader2 className="me-2 h-4 w-4 animate-spin"/>
                                        {t("usersPage.loading")}
                                    </>
                                ) : (
                                    t("usersPage.loadMore")
                                )}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

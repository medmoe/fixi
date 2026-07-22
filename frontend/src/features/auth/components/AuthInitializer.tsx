import {Outlet} from "react-router-dom";
import {useInitAuth} from "@/features/auth/hooks/useInitAuth.ts";
import {Loader2} from "lucide-react";
import React from "react";

export const AuthInitializer: React.FC = () => {
    const {isLoading} = useInitAuth()
    if (isLoading) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                <p className="text-sm font-medium text-muted-foreground">
                    Loading...
                </p>
            </div>

        )
    }
    return <Outlet/>
}
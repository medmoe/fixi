import {Button} from "@/components/ui/button";
import {Loader2 as LoadingIcon, LogOut as LogoutIcon} from "lucide-react";
import {useLogout} from "@/features/auth/hooks/useLogout";


export const Topbar = () => {
    const {handleLogout, isLoading} = useLogout()
    return (
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">System Dashboard</p>
                    <h1 className="font-display text-2xl text-slate-900">Operations Control</h1>
                </div>
                <Button variant="destructive" size={"lg"} onClick={handleLogout} disabled={isLoading}>
                    {isLoading ? <LoadingIcon className="mr-2 h-5 w-5 animate-spin"/> :
                        <LogoutIcon className="h-5 w-5"/>}
                </Button>
            </div>
        </header>
    );
};

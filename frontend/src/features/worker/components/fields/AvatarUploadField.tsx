import React, {useRef, useState} from 'react';
import {useUploadAvatar} from '@/features/worker';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar.tsx';
import {Button} from '@/components/ui/button.tsx';
import {Loader2, Upload} from 'lucide-react';

interface AvatarUploadFieldProps {
    currentAvatarUrl: string | null;
}

export const AvatarUploadField: React.FC<AvatarUploadFieldProps> = ({currentAvatarUrl}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const {mutate: uploadAvatar, isPending} = useUploadAvatar();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Fast client-side image object URL validation strategy
        const objectUrl = URL.createObjectURL(file);
        setLocalPreview(objectUrl);

        // Call Mutation Layer
        uploadAvatar(file, {
            onError: () => setLocalPreview(null) // Reset on drop
        });
    };

    const triggerFileInput = () => fileInputRef.current?.click();
    const src: string | undefined = localPreview ? localPreview : currentAvatarUrl ? currentAvatarUrl : undefined;
    return (
        <div className="flex items-center space-x-6 bg-card border p-4 rounded-xl">
            <div className="relative">
                <Avatar className="h-24 w-24 border-2 border-border">
                    <AvatarImage src={src} alt="Avatar profile graphic"/>
                    <AvatarFallback className="text-lg font-bold">WP</AvatarFallback>
                </Avatar>
                {isPending && (
                    <div className="absolute inset-0 bg-background/60 rounded-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                    </div>
                )}
            </div>
            <div className="space-y-2">
                <h4 className="text-sm font-medium leading-none">Profile Picture</h4>
                <p className="text-xs text-muted-foreground">Supports JPG, PNG under 5MB.</p>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                    disabled={isPending}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={triggerFileInput}
                    disabled={isPending}
                    aria-label="Upload avatar image file"
                    className="flex items-center gap-2"
                >
                    <Upload className="h-4 w-4"/>
                    Choose Image
                </Button>
            </div>
        </div>
    );
};
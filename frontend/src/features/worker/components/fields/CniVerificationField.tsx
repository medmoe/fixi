import React, {useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {useUploadCniDocument} from '@/features/worker';
import {Badge} from '@/components/ui/badge.tsx';
import {Button} from '@/components/ui/button.tsx';
import {CheckCircle2, Clock, Loader2, Upload} from 'lucide-react';

interface CniVerificationFieldProps {
    isVerified: boolean;
    hasCniDocument: boolean;
}

export const CniVerificationField: React.FC<CniVerificationFieldProps> = ({isVerified, hasCniDocument}) => {
    const {t} = useTranslation('worker');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {mutate: uploadCniDocument, isPending} = useUploadCniDocument();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        uploadCniDocument(file);
        e.target.value = '';
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    // is_verified alone can't distinguish "never uploaded" from "uploaded,
    // awaiting review" -- has_cni_document (a safe boolean, unlike the raw
    // storage key which the backend never exposes) fills that gap.
    const status: 'verified' | 'pending' | 'unverified' = isVerified
        ? 'verified'
        : hasCniDocument
            ? 'pending'
            : 'unverified';

    return (
        <div className="flex items-center justify-between gap-4 bg-card border p-4 rounded-xl">
            <div className="space-y-1">
                <h4 className="text-sm font-medium leading-none">{t('cniVerificationField.heading')}</h4>
                <p className="text-xs text-muted-foreground max-w-md">{t('cniVerificationField.helperText')}</p>
                <div className="pt-1">
                    {status === 'verified' && (
                        <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3"/>
                            {t('cniVerificationField.statusVerified')}
                        </Badge>
                    )}
                    {status === 'pending' && (
                        <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3"/>
                            {t('cniVerificationField.statusPending')}
                        </Badge>
                    )}
                    {status === 'unverified' && (
                        <Badge variant="destructive">{t('cniVerificationField.statusUnverified')}</Badge>
                    )}
                </div>
            </div>

            {status !== 'verified' && (
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/jpeg,image/png,application/pdf"
                        className="hidden"
                        disabled={isPending}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={triggerFileInput}
                        disabled={isPending}
                        className="flex items-center gap-2"
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
                        {status === 'pending' ? t('cniVerificationField.reupload') : t('cniVerificationField.upload')}
                    </Button>
                </div>
            )}
        </div>
    );
};

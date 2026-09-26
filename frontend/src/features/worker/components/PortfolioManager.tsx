import React, {useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {ImagePlus, Images, Loader2, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {useDeletePortfolioImage, usePortfolioImages, useUploadPortfolioImage} from "../hooks";
import {MAX_PORTFOLIO_IMAGES} from "../types";
import {PortfolioLightbox} from "./PortfolioLightbox";

interface PortfolioManagerProps {
    workerProfileId: number;
}

/** The worker's own "My work" gallery: upload, preview, delete. */
export const PortfolioManager: React.FC<PortfolioManagerProps> = ({workerProfileId}) => {
    const {t} = useTranslation("worker");
    const inputRef = useRef<HTMLInputElement>(null);
    const {data: images = [], isLoading} = usePortfolioImages(workerProfileId);
    const upload = useUploadPortfolioImage(workerProfileId);
    const remove = useDeletePortfolioImage(workerProfileId);
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

    const isFull = images.length >= MAX_PORTFOLIO_IMAGES;

    const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) upload.mutate(file);
        e.target.value = ""; // allow picking the same file again
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                        <Images className="h-5 w-5"/>
                        {t("portfolio.managerTitle")}
                    </CardTitle>
                    <CardDescription>{t("portfolio.managerDescription")}</CardDescription>
                </div>
                <span data-testid="portfolio-counter" className="text-sm text-muted-foreground whitespace-nowrap">
                    {t("portfolio.counter", {count: images.length, max: MAX_PORTFOLIO_IMAGES})}
                </span>
            </CardHeader>
            <CardContent className="space-y-4">
                {!isLoading && images.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t("portfolio.emptyState")}</p>
                )}

                {images.length > 0 && (
                    <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {images.map((image, i) => (
                            <li key={image.id} className="relative group">
                                <button
                                    type="button"
                                    onClick={() => setOpenIndex(i)}
                                    className="block w-full overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label={t("portfolio.openImage", {number: i + 1})}
                                >
                                    <img src={image.image_url} alt="" loading="lazy" className="aspect-square w-full object-cover"/>
                                </button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-1 end-1 h-7 w-7"
                                    onClick={() => setPendingDeleteId(image.id)}
                                    disabled={remove.isPending && remove.variables === image.id}
                                    aria-label={t("portfolio.deleteImage", {number: i + 1})}
                                >
                                    {remove.isPending && remove.variables === image.id
                                        ? <Loader2 className="h-4 w-4 animate-spin"/>
                                        : <Trash2 className="h-4 w-4"/>}
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={onFileChosen}
                    data-testid="portfolio-file-input"
                />
                <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={isFull || upload.isPending}>
                    {upload.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin"/> : <ImagePlus className="me-2 h-4 w-4"/>}
                    {upload.isPending ? t("portfolio.uploading") : t("portfolio.addPhoto")}
                </Button>
                {isFull && <p className="text-xs text-muted-foreground">{t("portfolio.limitReached", {max: MAX_PORTFOLIO_IMAGES})}</p>}
            </CardContent>

            <PortfolioLightbox images={images} index={openIndex} onIndexChange={setOpenIndex}/>

            <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("portfolio.deleteConfirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("portfolio.deleteConfirmDescription")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("portfolio.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (pendingDeleteId !== null) remove.mutate(pendingDeleteId);
                                setPendingDeleteId(null);
                            }}
                        >
                            {t("portfolio.deleteConfirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
};

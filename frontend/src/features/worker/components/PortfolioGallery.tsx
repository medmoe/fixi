import React, {useState} from "react";
import {useTranslation} from "react-i18next";
import {Images} from "lucide-react";
import {Skeleton} from "@/components/ui/skeleton";
import {usePortfolioImages} from "../hooks";
import {PortfolioLightbox} from "./PortfolioLightbox";

interface PortfolioGalleryProps {
    workerProfileId: number;
}

/** Public, read-only portfolio on a worker's profile page. Renders nothing if the worker has no photos. */
export const PortfolioGallery: React.FC<PortfolioGalleryProps> = ({workerProfileId}) => {
    const {t} = useTranslation("worker");
    const {data: images = [], isLoading} = usePortfolioImages(workerProfileId);
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    if (isLoading) {
        return (
            <div className="grid grid-cols-3 gap-2" aria-busy="true">
                <Skeleton className="aspect-square"/>
                <Skeleton className="aspect-square"/>
                <Skeleton className="aspect-square"/>
            </div>
        );
    }

    if (images.length === 0) return null;

    return (
        <section aria-labelledby="portfolio-heading" className="space-y-3">
            <h2 id="portfolio-heading" className="text-lg font-semibold flex items-center gap-2">
                <Images className="h-5 w-5"/>
                {t("portfolio.publicHeading")}
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {images.map((image, i) => (
                    <li key={image.id}>
                        <button
                            type="button"
                            onClick={() => setOpenIndex(i)}
                            className="block w-full overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={t("portfolio.openImage", {number: i + 1})}
                        >
                            <img src={image.image_url} alt="" loading="lazy" className="aspect-square w-full object-cover transition-transform hover:scale-105"/>
                        </button>
                    </li>
                ))}
            </ul>
            <PortfolioLightbox images={images} index={openIndex} onIndexChange={setOpenIndex}/>
        </section>
    );
};

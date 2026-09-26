"""Sanitize user-uploaded images before they're stored.

Phone photos carry EXIF metadata -- most importantly GPS coordinates -- and
`bucket_uploads` is public-read, so storing the original bytes would publish
e.g. the exact location of a customer's home. Every image upload path
(avatar, portfolio, job photos) must go through `sanitize_image` and store
its output, never the raw upload.

Re-encoding with Pillow drops EXIF/XMP/comments by construction (nothing is
copied over except the ICC color profile, which carries no personal data and
keeps colors correct for wide-gamut phone photos).
"""

import io
from dataclasses import dataclass

from fastapi import HTTPException, status
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_IMAGE_DIMENSION = 2048
JPEG_QUALITY = 85


@dataclass(frozen=True)
class SanitizedImage:
    data: bytes
    content_type: str
    extension: str


def sanitize_image(contents: bytes) -> SanitizedImage:
    """Decode, re-orient, downscale and re-encode an uploaded image.

    PNG and WebP keep their format (they may carry transparency); anything
    else Pillow can decode is re-encoded as JPEG. Raises 400 for anything
    that isn't a decodable image.
    """
    try:
        with Image.open(io.BytesIO(contents)) as original:
            source_format = original.format
            icc_profile = original.info.get("icc_profile")
            # Bake the EXIF orientation into the pixels *before* dropping the
            # metadata, otherwise rotated phone photos display sideways.
            image = ImageOps.exif_transpose(original)
            image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, SyntaxError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or unsupported image file.") from e

    image.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION))

    if source_format == "PNG":
        output_format, content_type, extension = "PNG", "image/png", "png"
    elif source_format == "WEBP":
        output_format, content_type, extension = "WEBP", "image/webp", "webp"
    else:
        output_format, content_type, extension = "JPEG", "image/jpeg", "jpg"
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")

    save_kwargs: dict = {"format": output_format}
    if icc_profile:
        save_kwargs["icc_profile"] = icc_profile
    if output_format == "JPEG":
        save_kwargs.update(quality=JPEG_QUALITY, optimize=True)

    buffer = io.BytesIO()
    image.save(buffer, **save_kwargs)
    return SanitizedImage(data=buffer.getvalue(), content_type=content_type, extension=extension)

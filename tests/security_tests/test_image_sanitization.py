from io import BytesIO

import pytest
from fastapi import HTTPException
from PIL import Image

from src.app.services.image_processing import MAX_IMAGE_DIMENSION, sanitize_image

# EXIF tag ids
ORIENTATION = 0x0112
GPS_IFD = 0x8825
MAKE = 0x010F


def _jpeg_with_exif(size: tuple[int, int] = (40, 20), orientation: int | None = None) -> bytes:
    """A JPEG carrying GPS coordinates + camera make, like a real phone photo."""
    image = Image.new("RGB", size, color="blue")
    # Mark the left half so rotation is observable after decoding.
    for x in range(size[0] // 2):
        for y in range(size[1]):
            image.putpixel((x, y), (255, 0, 0))
    exif = Image.Exif()
    exif[MAKE] = "PhoneMaker"
    exif[GPS_IFD] = {1: "N", 2: (36.0, 45.0, 10.0), 3: "E", 4: (3.0, 3.0, 30.0)}  # Algiers
    if orientation is not None:
        exif[ORIENTATION] = orientation
    buffer = BytesIO()
    image.save(buffer, format="JPEG", exif=exif.tobytes())
    return buffer.getvalue()


def _png_bytes(size: tuple[int, int] = (10, 10), mode: str = "RGBA") -> bytes:
    buffer = BytesIO()
    Image.new(mode, size).save(buffer, format="PNG")
    return buffer.getvalue()


class TestSanitizeImage:
    def test_fixture_really_has_gps_exif(self):
        # Guard: if this ever stops holding, the stripping test below proves nothing.
        with Image.open(BytesIO(_jpeg_with_exif())) as img:
            assert img.getexif().get_ifd(GPS_IFD)

    def test_strips_all_exif_including_gps(self):
        result = sanitize_image(_jpeg_with_exif())

        with Image.open(BytesIO(result.data)) as img:
            exif = img.getexif()
            assert not exif.get_ifd(GPS_IFD)
            assert MAKE not in exif
            assert len(exif) == 0
            assert "exif" not in img.info

    def test_applies_orientation_before_dropping_it(self):
        # Orientation 6 = "rotate 90° clockwise to display": a 40x20 stored
        # image must come out 20x40, with no orientation tag left behind.
        result = sanitize_image(_jpeg_with_exif(size=(40, 20), orientation=6))

        with Image.open(BytesIO(result.data)) as img:
            assert img.size == (20, 40)
            assert ORIENTATION not in img.getexif()

    def test_downscales_large_images_keeping_aspect_ratio(self):
        big = BytesIO()
        Image.new("RGB", (MAX_IMAGE_DIMENSION * 2, MAX_IMAGE_DIMENSION)).save(big, format="JPEG")

        result = sanitize_image(big.getvalue())

        with Image.open(BytesIO(result.data)) as img:
            assert img.size == (MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION // 2)

    def test_leaves_small_images_at_their_size(self):
        result = sanitize_image(_jpeg_with_exif(size=(40, 20)))

        with Image.open(BytesIO(result.data)) as img:
            assert img.size == (40, 20)

    def test_jpeg_stays_jpeg(self):
        result = sanitize_image(_jpeg_with_exif())
        assert (result.content_type, result.extension) == ("image/jpeg", "jpg")

    def test_png_stays_png_and_keeps_transparency(self):
        result = sanitize_image(_png_bytes(mode="RGBA"))

        assert (result.content_type, result.extension) == ("image/png", "png")
        with Image.open(BytesIO(result.data)) as img:
            assert img.mode == "RGBA"

    def test_other_formats_become_jpeg(self):
        gif = BytesIO()
        Image.new("P", (10, 10)).save(gif, format="GIF")

        result = sanitize_image(gif.getvalue())

        assert result.content_type == "image/jpeg"
        with Image.open(BytesIO(result.data)) as img:
            assert img.format == "JPEG"

    @pytest.mark.parametrize("payload", [b"", b"not an image", b"\x89PNG\r\n\x1a\n" + b"\x00" * 100, b"%PDF-1.4 fake"])
    def test_rejects_undecodable_input_with_400(self, payload: bytes):
        with pytest.raises(HTTPException) as exc_info:
            sanitize_image(payload)
        assert exc_info.value.status_code == 400

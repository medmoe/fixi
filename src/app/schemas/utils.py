import re


def build_wkt_point(lat: float | None, lng: float | None) -> str | None:
    if (lat is None) != (lng is None):
        raise ValueError("Both latitude and longitude must be provided together.")
    if lat is not None and lng is not None:
        return f"POINT({lng} {lat})"
    return None

def parse_wkt_point(wkt: str) -> tuple[float, float]:
    """
    Parses a WKT 'POINT(lon lat)' string into (longitude, latitude) floats.
    Raises ValueError if the string doesn't match the expected format.
    """
    match = re.match(r"POINT\(\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s*\)", wkt)
    if not match:
        raise ValueError(f"Invalid WKT point format: {wkt!r}")
    longitude, latitude = float(match.group(1)), float(match.group(2))
    return longitude, latitude

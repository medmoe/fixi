
def build_wkt_point(lat: float | None, lng: float | None) -> str | None:
    if (lat is None) != (lng is None):
        raise ValueError("Both latitude and longitude must be provided together.")
    if lat is not None and lng is not None:
        return f"POINT({lng} {lat})"
    return None

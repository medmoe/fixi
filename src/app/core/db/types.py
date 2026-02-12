from sqlalchemy import func
from sqlalchemy.types import UserDefinedType


class PostGISPoint(UserDefinedType):
    cache_ok = True
    python_type = str

    def get_col_spec(self, **kw):  # type: ignore[no-untyped-def]
        return "geometry(POINT,4326)"

    def bind_expression(self, bindvalue):  # type: ignore[no-untyped-def]
        # Accept WKT/EWKT-ish input and normalize SRID to 4326.
        return func.ST_SetSRID(func.ST_GeomFromText(bindvalue), 4326)

    def column_expression(self, col):  # type: ignore[no-untyped-def]
        # Return human-readable WKT to API layer.
        return func.ST_AsText(col)

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class ClientCacheMiddleware(BaseHTTPMiddleware):
    """Sets a default `Cache-Control: no-store` on responses that don't already have one.

    Note
    ----
        Routes serving genuinely stable data (e.g. trade categories) opt into caching
        explicitly by setting their own `Cache-Control` response header *before* this
        middleware runs (see `read_trade_categories`). Everything else defaults to
        `no-store`: this app's data (jobs, applications, profiles, ...) mutates based on
        other users' actions, and a blanket `public, max-age=N` previously caused the
        browser to serve stale GET responses -- invisible to React Query's own cache,
        which had correctly invalidated and re-requested -- until a hard refresh bypassed
        the browser's HTTP cache. A `public` cache is also unsafe by default for
        authenticated, per-user data: a shared cache does not know to key by the
        `Authorization` header unless told to.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response: Response = await call_next(request)
        if "Cache-Control" not in response.headers:
            response.headers["Cache-Control"] = "no-store"
        return response

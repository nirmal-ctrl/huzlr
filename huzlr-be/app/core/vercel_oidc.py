import os
from contextvars import ContextVar, Token

from starlette.datastructures import Headers
from starlette.types import ASGIApp, Receive, Scope, Send


_vercel_oidc_token: ContextVar[str | None] = ContextVar(
    "vercel_oidc_token",
    default=None,
)


def bind_vercel_oidc_token(token: str | None) -> Token:
    """Bind the token supplied by Vercel to the current request context."""

    normalized_token = token.strip() if token else None
    return _vercel_oidc_token.set(normalized_token or None)


def reset_vercel_oidc_token(token: Token) -> None:
    _vercel_oidc_token.reset(token)


def get_vercel_oidc_token() -> str | None:
    """Return a request token, falling back to Vercel's build/local env value."""

    return _vercel_oidc_token.get() or os.getenv("VERCEL_OIDC_TOKEN")


class VercelOIDCTokenMiddleware:
    """Expose Vercel's per-request OIDC header to Google auth refreshes."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        token = bind_vercel_oidc_token(
            Headers(scope=scope).get("x-vercel-oidc-token")
        )
        try:
            await self.app(scope, receive, send)
        finally:
            reset_vercel_oidc_token(token)

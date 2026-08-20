from collections.abc import Iterable, Mapping
from typing import Any


GOOGLE_AUTH_COOKIE_NAMES = frozenset({
    "SID",
    "HSID",
    "SSID",
    "APISID",
    "SAPISID",
    "__Secure-1PSID",
    "__Secure-3PSID",
    "__Secure-1PAPISID",
    "__Secure-3PAPISID",
})


def has_google_auth_cookies(cookies: Iterable[Mapping[str, Any]]) -> bool:
    return any(
        str(cookie.get("domain", "")).lstrip(".").endswith("google.com")
        and cookie.get("name") in GOOGLE_AUTH_COOKIE_NAMES
        for cookie in cookies
    )

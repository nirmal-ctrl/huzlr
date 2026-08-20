import unittest

from bridge.google_auth import has_google_auth_cookies


class GoogleAuthenticationCookieTests(unittest.TestCase):
    def test_accepts_google_session_cookie(self):
        cookies = [{"domain": ".google.com", "name": "SAPISID"}]

        self.assertTrue(has_google_auth_cookies(cookies))

    def test_accepts_secure_google_session_cookie(self):
        cookies = [{"domain": ".google.com", "name": "__Secure-1PSID"}]

        self.assertTrue(has_google_auth_cookies(cookies))

    def test_rejects_anonymous_google_cookies(self):
        cookies = [
            {"domain": ".google.com", "name": "NID"},
            {"domain": "meet.google.com", "name": "OTZ"},
        ]

        self.assertFalse(has_google_auth_cookies(cookies))

    def test_rejects_same_cookie_name_from_unrelated_domain(self):
        cookies = [{"domain": "example.com", "name": "SID"}]

        self.assertFalse(has_google_auth_cookies(cookies))


if __name__ == "__main__":
    unittest.main()

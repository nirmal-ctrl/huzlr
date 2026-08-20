import argparse
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

from bridge.google_auth import has_google_auth_cookies


DEFAULT_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DEFAULT_CDP_PORT = 9222


def _wait_for_chrome(endpoint: str, timeout: float = 20.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(f"{endpoint}/json/version", timeout=1):
                return
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.25)
    raise RuntimeError(f"Chrome debugging endpoint did not start at {endpoint}")


def provision(profile_dir: str, browser_executable: str, storage_state_path: str, cdp_port: int):
    if not Path(browser_executable).is_file():
        raise RuntimeError(f"Google Chrome not found at {browser_executable}")
    Path(profile_dir).mkdir(parents=True, exist_ok=True)
    state_path = Path(storage_state_path).resolve()
    state_path.parent.mkdir(parents=True, exist_ok=True)
    endpoint = f"http://127.0.0.1:{cdp_port}"
    process = subprocess.Popen([
        browser_executable,
        f"--user-data-dir={profile_dir}",
        f"--remote-debugging-port={cdp_port}",
        "--remote-debugging-address=127.0.0.1",
        "--password-store=basic",
        "--use-mock-keychain",
        "--no-first-run",
        "--no-default-browser-check",
        "https://accounts.google.com/",
    ])
    try:
        _wait_for_chrome(endpoint)
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(endpoint)
            if not browser.contexts:
                raise RuntimeError("Chrome did not expose its browser context")
            context = browser.contexts[0]

            print("Sign in to the dedicated Google bot account in Chrome.")
            print("Keep Chrome open and confirm that the account avatar is visible on meet.google.com.")
            input("Press Enter here after sign-in is complete: ")

            cookies = context.cookies()
            if not has_google_auth_cookies(cookies):
                raise RuntimeError(
                    "Google sign-in was not detected. Keep Chrome open, finish sign-in, "
                    "and run this command again."
                )
            context.storage_state(path=str(state_path))
            os.chmod(state_path, 0o600)
            browser.close()
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
    print(f"Verified Google authentication state saved to {state_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Provision a persistent Chromium profile for the dedicated Google bot account")
    parser.add_argument("profile_dir", help="Dedicated directory that will be mounted into the worker container")
    parser.add_argument(
        "--browser-executable",
        default=os.environ.get("CHROME_EXECUTABLE_PATH", DEFAULT_CHROME),
        help="Path to a normal Google Chrome installation",
    )
    parser.add_argument(
        "--storage-state",
        help="Output path for portable Playwright authentication state (defaults inside profile_dir)",
    )
    parser.add_argument("--cdp-port", type=int, default=DEFAULT_CDP_PORT)
    args = parser.parse_args()
    profile_dir = os.path.abspath(args.profile_dir)
    storage_state = args.storage_state or os.path.join(profile_dir, "auth-state.json")
    provision(profile_dir, args.browser_executable, storage_state, args.cdp_port)

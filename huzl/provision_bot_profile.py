import argparse
import os
import subprocess
from pathlib import Path


DEFAULT_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def provision(profile_dir: str, browser_executable: str):
    if not Path(browser_executable).is_file():
        raise RuntimeError(f"Google Chrome not found at {browser_executable}")
    Path(profile_dir).mkdir(parents=True, exist_ok=True)
    process = subprocess.Popen([
        browser_executable,
        f"--user-data-dir={profile_dir}",
        "--password-store=basic",
        "--use-mock-keychain",
        "--no-first-run",
        "--no-default-browser-check",
        "https://accounts.google.com/",
    ])
    try:
        print("Complete Google sign-in in Chrome. Do not enter credentials into this terminal.")
        input("Close the Chrome window after sign-in, then press Enter: ")
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
    print(f"Bot profile provisioned at {profile_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Provision a persistent Chromium profile for the dedicated Google bot account")
    parser.add_argument("profile_dir", help="Dedicated directory that will be mounted into the worker container")
    parser.add_argument(
        "--browser-executable",
        default=os.environ.get("CHROME_EXECUTABLE_PATH", DEFAULT_CHROME),
        help="Path to a normal Google Chrome installation",
    )
    args = parser.parse_args()
    provision(os.path.abspath(args.profile_dir), args.browser_executable)

"""Run Hugo at the version pinned in `.hugo-version`.

    uv run scripts/hugo.py [hugo arguments...]

With no arguments it builds the production site into `public/`. Any arguments go to Hugo
unchanged, but for `--enableGitInfo` (below), and the command exits with Hugo's status.

Search (spec 006): after every successful build, Pagefind (a dev dependency, run with uv) indexes
the output into `<destination>/pagefind/`. Before `server` starts, a build of the server's
environment (development unless `--environment` names another) is indexed into
`.tools/pagefind/<environment>/pagefind/`, which config/development/hugo.toml and, for the samples
preview, config/samples/hugo.toml mount as static, so the dev server searches too; that index is
as fresh as the server's start.

Dates of change (spec 020): a build or server whose source sits in a git work tree runs with
`--enableGitInfo`, so a page without `lastmod` takes the date of the last commit that touched its
content file (hugo.toml, [frontmatter]). Hugo fails outright with that option where there is no
history, so a copy of the tree without `.git` builds without it, and its pages fall back to
`lastmod` or their date.

The `hugo` on the PATH is used when it is the pinned version (extended edition). Otherwise the
pinned release is fetched from GitHub into `.tools/hugo-<version>/`, checked against Hugo's
published checksums, and used from there; later runs reuse it.
"""

from __future__ import annotations

import hashlib
import os
import platform
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
VERSION = (REPO / ".hugo-version").read_text(encoding="utf-8").strip()
TOOLS = REPO / ".tools"
RELEASES = "https://github.com/gohugoio/hugo/releases/download"
DEFAULT_ARGS = ["--environment", "production", "--destination", "public", "--cleanDestinationDir"]


def log(message: str) -> None:
    print(f"scripts/hugo.py: {message}", file=sys.stderr)


def is_pinned(binary: str | Path) -> bool:
    """True when `binary` runs and reports the pinned version, extended edition."""
    try:
        out = subprocess.run(
            [str(binary), "version"], capture_output=True, text=True, timeout=60
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return False
    return re.search(rf"\bv{re.escape(VERSION)}\b\S*\+extended\b", out) is not None


def asset_name() -> str:
    system, machine = platform.system(), platform.machine().lower()
    arch = {"x86_64": "amd64", "amd64": "amd64", "aarch64": "arm64", "arm64": "arm64"}.get(machine)
    if system == "Darwin":
        return f"hugo_extended_{VERSION}_darwin-universal.pkg"
    if system == "Linux" and arch:
        return f"hugo_extended_{VERSION}_linux-{arch}.tar.gz"
    if system == "Windows" and arch:
        return f"hugo_extended_{VERSION}_windows-{arch}.zip"
    sys.exit(f"scripts/hugo.py: no Hugo release for {system} {machine}; install Hugo v{VERSION} extended")


def download(url: str, target: Path) -> None:
    log(f"fetching {url}")
    with urllib.request.urlopen(url, timeout=300) as response, target.open("wb") as out:
        shutil.copyfileobj(response, out)


def expected_sha256(checksums: str, asset: str) -> str:
    for line in checksums.splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[1].lstrip("*") == asset:
            return parts[0].lower()
    sys.exit(f"scripts/hugo.py: {asset} is not listed in the checksums of Hugo v{VERSION}")


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def extract(archive: Path, work: Path, binary_name: str) -> Path:
    """Unpack the Hugo binary from a release asset into `work` and return its path."""
    work.mkdir(parents=True, exist_ok=True)
    if archive.name.endswith(".tar.gz"):
        with tarfile.open(archive) as tar:
            tar.extract(tar.getmember(binary_name), work, filter="data")
        return work / binary_name
    if archive.name.endswith(".zip"):
        with zipfile.ZipFile(archive) as zf:
            zf.extract(binary_name, work)
        return work / binary_name
    if archive.name.endswith(".pkg"):
        # Hugo ships macOS builds only as an installer package; expand it without installing.
        expanded = work / "expanded"
        subprocess.run(["pkgutil", "--expand-full", str(archive), str(expanded)], check=True)
        found = [p for p in expanded.rglob(binary_name) if p.is_file() and "Payload" in p.parts]
        if not found:
            sys.exit(f"scripts/hugo.py: no {binary_name} binary inside {archive.name}")
        return found[0]
    sys.exit(f"scripts/hugo.py: cannot unpack {archive.name}")


def fetch() -> Path:
    """Fetch, verify, and install the pinned Hugo under `.tools/`; return the binary's path."""
    binary_name = "hugo.exe" if platform.system() == "Windows" else "hugo"
    home = TOOLS / f"hugo-{VERSION}"
    binary = home / binary_name
    if binary.is_file() and is_pinned(binary):
        return binary

    asset = asset_name()
    TOOLS.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=TOOLS, prefix=".fetch-") as tmp:
        work = Path(tmp)
        sums = work / "checksums.txt"
        download(f"{RELEASES}/v{VERSION}/hugo_{VERSION}_checksums.txt", sums)
        archive = work / asset
        download(f"{RELEASES}/v{VERSION}/{asset}", archive)
        want, got = expected_sha256(sums.read_text(encoding="utf-8"), asset), sha256_of(archive)
        if want != got:
            sys.exit(f"scripts/hugo.py: checksum mismatch for {asset}: expected {want}, got {got}")
        log(f"verified {asset}")

        unpacked = extract(archive, work / "unpacked", binary_name)
        unpacked.chmod(0o755)
        staged = work / "home"
        staged.mkdir()
        shutil.move(str(unpacked), staged / binary_name)
        if not is_pinned(staged / binary_name):
            sys.exit(f"scripts/hugo.py: the fetched binary does not report Hugo v{VERSION} extended")
        if home.exists():
            shutil.rmtree(home)
        os.replace(staged, home)
    return binary


def find_hugo() -> Path | str:
    on_path = shutil.which("hugo")
    if on_path and is_pinned(on_path):
        return on_path
    return fetch()


def option(args: list[str], *names: str) -> str | None:
    """The value of the last of Hugo's `names` options in `args` (`--name value` or `--name=value`)."""
    value = None
    for i, arg in enumerate(args):
        for name in names:
            if arg == name and i + 1 < len(args):
                value = args[i + 1]
            elif name.startswith("--") and arg.startswith(name + "="):
                value = arg.split("=", 1)[1]
    return value


def build_destination(args: list[str], cwd: Path) -> Path | None:
    """Where a build writes the site, or None when `args` are not a build that writes to disk."""
    if args and not (args[0].startswith("-") or args[0] == "build"):
        return None
    if "--renderToMemory" in args:
        return None
    source = Path(option(args, "-s", "--source") or ".")
    source = source if source.is_absolute() else cwd / source
    destination = Path(option(args, "-d", "--destination") or "public")
    return destination if destination.is_absolute() else source / destination


# Pagefind's own search interfaces. The palette (assets/js/palette.js) calls its API instead, so
# these are removed: they would bring styles and scripts the design system does not hold.
UNUSED_PAGEFIND = ("pagefind-ui.*", "pagefind-modular-ui.*", "pagefind-component-ui.*", "pagefind-highlight.js")


def index(site: Path, bundle: Path | None = None) -> int:
    """Index a built site with Pagefind into `bundle` (default `<site>/pagefind`); return its status."""
    try:
        import pagefind  # noqa: F401  (only to say what is missing)
    except ImportError:
        log("Pagefind is missing; run `uv sync` to install the dev dependencies")
        return 1
    bundle = bundle or site / "pagefind"
    command = [sys.executable, "-m", "pagefind", "--site", str(site), "--output-path", str(bundle), "--silent"]
    status = subprocess.run(command).returncode
    for pattern in UNUSED_PAGEFIND:
        for path in bundle.glob(pattern):
            path.unlink()
    return status


def index_for_server(hugo: Path | str, args: list[str]) -> int:
    """Build the server's environment into a scratch folder and index it for the dev server."""
    environment = option(args, "-e", "--environment") or "development"
    output = TOOLS / "pagefind" / environment / "pagefind"
    with tempfile.TemporaryDirectory(prefix="pagefind-site-") as tmp:
        built = subprocess.run(
            [str(hugo), *with_git_info(["--environment", environment, "--destination", tmp, "--quiet"], REPO)],
            cwd=REPO,
        ).returncode
        if built != 0:
            return built
        if output.exists():
            shutil.rmtree(output)
        return index(Path(tmp), output)


def has_history(args: list[str], cwd: Path) -> bool:
    """True when the source of a build or server sits in a git work tree with at least one commit."""
    if args and not (args[0].startswith("-") or args[0] in ("build", "server")):
        return False
    source = Path(option(args, "-s", "--source") or ".")
    source = source if source.is_absolute() else cwd / source
    try:
        result = subprocess.run(
            ["git", "-C", str(source), "rev-parse", "--verify", "--quiet", "HEAD"],
            capture_output=True, text=True, timeout=60,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return result.returncode == 0


def with_git_info(args: list[str], cwd: Path) -> list[str]:
    """`args` with `--enableGitInfo` added when the source has history (see the module's notes)."""
    if any(a.lower().startswith("--enablegitinfo") for a in args) or not has_history(args, cwd):
        return args
    if args and args[0] in ("build", "server"):
        return [args[0], "--enableGitInfo", *args[1:]]
    return ["--enableGitInfo", *args]


def main(argv: list[str]) -> int:
    hugo = find_hugo()
    args = argv or DEFAULT_ARGS
    cwd = REPO if not argv else Path.cwd()
    try:
        if args[:1] == ["server"]:
            status = index_for_server(hugo, args)
            if status != 0:
                log("could not index the site for the dev server; search will not work there")
        status = subprocess.run([str(hugo), *with_git_info(args, cwd)], cwd=cwd).returncode
        destination = build_destination(args, cwd)
        if status == 0 and destination is not None:
            status = index(destination)
        return status
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

"""Huzlr-controlled Docker backend. No host paths, credentials, or network in tools.

Workspace snapshots are bounded, stored with the authorized execution, and restored
into a fresh container after approval. Interrupted actions are never replayed.
"""
from __future__ import annotations

import asyncio
import json
import base64
from typing import Protocol
from uuid import UUID, uuid4

from core.config import settings

SANDBOX_TOOLS = {"read_file", "write_file", "run_command", "list_files"}
SNAPSHOT_BYTES = 1024 * 1024

# This program runs INSIDE the container. All paths and subprocesses stay there.
PROGRAM = r'''
import base64, json, os, pathlib, stat, subprocess, sys, tempfile, signal
root = pathlib.Path('/workspace')
request = json.load(sys.stdin)
action, args = request['action'], request.get('arguments', {})
def path(value):
    p = pathlib.Path(value)
    if not value or p.is_absolute() or '..' in p.parts:
        raise ValueError('Use a relative workspace path without ..')
    result = root / p
    if any(part.is_symlink() for part in [result, *result.parents]):
        raise ValueError('Symlinks are not allowed')
    if not result.resolve().is_relative_to(root):
        raise ValueError('Path is outside workspace')
    return result
def snapshot():
    files, size = {}, 0
    for folder, dirs, names in os.walk(root, followlinks=False):
        dirs[:] = sorted(d for d in dirs if not (pathlib.Path(folder) / d).is_symlink())
        for name in sorted(names):
            p = pathlib.Path(folder) / name
            if not stat.S_ISREG(p.lstat().st_mode):
                continue
            size += p.stat().st_size
            if size > 1048576 or len(files) >= 100:
                raise ValueError('Workspace snapshot exceeds 1 MiB or 100 files')
            with p.open('rb') as handle:
                data = handle.read(1048577)
            if len(data) + sum(len(base64.b64decode(v)) for v in files.values()) > 1048576:
                raise ValueError('Workspace snapshot exceeds 1 MiB')
            files[str(p.relative_to(root))] = base64.b64encode(data).decode()
    return files
try:
    if action == 'restore':
        for name, data in args.get('files', {}).items():
            p = path(name); p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(base64.b64decode(data, validate=True))
        result = {'restored': len(args.get('files', {}))}
    elif action == 'snapshot':
        result = {'files': snapshot()}
    elif action == 'list_files':
        p = path(args.get('path', '.'))
        result = {'files': sorted(x.name + ('/' if x.is_dir() else '') for x in p.iterdir())[:200]}
    elif action == 'read_file':
        with path(args.get('path', '')).open('rb') as f:
            data = f.read(32769)
        result = {'content': data[:32768].decode('utf-8', errors='replace'), 'truncated': len(data) > 32768}
    elif action == 'write_file':
        content = args.get('content', '')
        if not isinstance(content, str) or len(content.encode()) > 65536:
            raise ValueError('File content must be text up to 64 KiB')
        p = path(args.get('path', '')); p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content)
        result = {'path': str(p.relative_to(root)), 'bytes': len(content.encode())}
    elif action == 'run_command':
        command = args.get('command')
        if not isinstance(command, str) or not command.strip() or len(command) > 8000:
            raise ValueError('command must contain 1 to 8000 characters')
        # Files bound capture memory; /tmp is a size-limited container tmpfs.
        with tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
            try:
                child = subprocess.Popen(['/bin/sh', '-c', command], cwd=root, stdout=out, stderr=err,
                                         start_new_session=True, env={'PATH': '/usr/local/bin:/usr/bin:/bin', 'HOME': '/workspace'})
                code = child.wait(timeout=30)
            except subprocess.TimeoutExpired:
                code = 124
            finally:
                if 'child' in locals():
                    try: os.killpg(child.pid, signal.SIGKILL)
                    except ProcessLookupError: pass
                    child.wait()
            out.seek(0); err.seek(0)
            stdout, stderr = out.read(16385), err.read(16385)
        result = {'exit_code': code, 'stdout': stdout[:16384].decode(errors='replace'),
                  'stderr': stderr[:16384].decode(errors='replace'), 'truncated': max(len(stdout),len(stderr)) > 16384}
    else:
        raise ValueError('Unknown sandbox action')
    print(json.dumps(result))
except Exception as exc:
    print(json.dumps({'error': str(exc)[:1000]}))
    sys.exit(1)
'''


class SandboxBackend(Protocol):
    name: str
    async def start(self, files: dict[str, str]) -> None: ...
    async def execute(self, name: str, arguments: dict) -> dict: ...
    async def snapshot(self) -> dict[str, str]: ...
    async def close(self) -> None: ...


async def docker(*arguments: str, stdin: bytes | None = None, timeout: int = 40) -> tuple[int, str]:
    """Argument-vector invocation; model content is stdin, never host shell code."""
    process = await asyncio.create_subprocess_exec(
        "docker", *arguments, stdin=asyncio.subprocess.PIPE if stdin is not None else asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    async def communicate():
        async def read(stream):
            chunks, total = [], 0
            while chunk := await stream.read(65536):
                total += len(chunk)
                if total > 2 * SNAPSHOT_BYTES:
                    raise ValueError("Sandbox response exceeds limit")
                chunks.append(chunk)
            return b"".join(chunks)
        async def write():
            if stdin is not None:
                process.stdin.write(stdin)
                await process.stdin.drain()
                process.stdin.close()
        tasks = [asyncio.create_task(read(process.stdout)), asyncio.create_task(read(process.stderr)), asyncio.create_task(write())]
        try:
            output, error, _ = await asyncio.gather(*tasks)
            await process.wait()
        finally:
            for task in tasks:
                if not task.done():
                    task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
        return process.returncode, (output if process.returncode == 0 else error or output).decode(errors="replace")
    try:
        return await asyncio.wait_for(communicate(), timeout)
    finally:
        if process.returncode is None:
            process.kill()
            await process.wait()


async def sandbox_available() -> bool:
    """Verify the configured worker host can actually reach Docker."""
    if not settings.AI_WORKER_SANDBOX_ENABLED:
        return False
    try:
        code, _ = await docker("info", "--format", "{{.ServerVersion}}", timeout=3)
        return code == 0
    except (OSError, TimeoutError, asyncio.TimeoutError):
        return False


class DockerSandbox:
    def __init__(self, execution_id: str, runtime_seconds: int):
        self.execution_id = str(UUID(execution_id))
        self.name = f"huzlr-sandbox-{self.execution_id}-{uuid4().hex[:8]}"
        self.runtime_seconds = runtime_seconds

    async def start(self, files: dict[str, str]) -> None:
        if not settings.AI_WORKER_SANDBOX_ENABLED:
            raise ValueError("Managed sandbox infrastructure is not enabled")
        code, output = await docker(
            "run", "--detach", "--pull=never", "--name", self.name,
            "--label", "huzlr.managed-sandbox=true", "--label", f"huzlr.execution={self.execution_id}",
            "--label", f"huzlr.host={settings.AI_WORKER_SANDBOX_HOST_ID}",
            "--network=none", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges=true",
            "--user=1000:1000", "--pids-limit=64", "--init", "--log-driver=none",
            f"--memory={settings.AI_WORKER_SANDBOX_MEMORY_MB}m", f"--memory-swap={settings.AI_WORKER_SANDBOX_MEMORY_MB}m",
            f"--cpus={settings.AI_WORKER_SANDBOX_CPUS}", "--ulimit=nofile=256:256",
            "--tmpfs=/workspace:rw,nosuid,nodev,size=128m,uid=1000,gid=1000,mode=0700",
            "--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=32m,mode=1777", "--workdir=/workspace",
            settings.AI_WORKER_SANDBOX_IMAGE, "python", "-c", f"import time; time.sleep({self.runtime_seconds + 30})",
        )
        if code:
            raise ValueError(f"Sandbox provisioning failed: {output[:1000]}")
        if files:
            await self.execute("restore", {"files": files})

    async def execute(self, name: str, arguments: dict) -> dict:
        code, output = await docker("exec", "-i", self.name, "python", "-I", "-c", PROGRAM,
                                    stdin=json.dumps({"action": name, "arguments": arguments}).encode())
        try:
            result = json.loads(output)
        except ValueError:
            raise ValueError(f"Sandbox tool failed: {output[:1000]}")
        if code:
            raise ValueError(result.get("error", "Sandbox tool failed"))
        return result

    async def snapshot(self) -> dict[str, str]:
        files = (await self.execute("snapshot", {}))["files"]
        if not isinstance(files, dict) or len(files) > 100:
            raise ValueError("Invalid workspace snapshot")
        size = 0
        from pathlib import PurePosixPath
        for name, data in files.items():
            path = PurePosixPath(name)
            if not name or path.is_absolute() or ".." in path.parts or len(name) > 1024:
                raise ValueError("Invalid artifact path")
            size += len(base64.b64decode(data, validate=True))
            if size > SNAPSHOT_BYTES:
                raise ValueError("Workspace snapshot exceeds 1 MiB")
        return files

    async def close(self) -> None:
        code, output = await docker("rm", "--force", self.name)
        if code and "No such container" not in output:
            raise RuntimeError(f"Sandbox cleanup failed: {output[:1000]}")


async def reap_sandboxes(db) -> None:
    """Reconcile only Huzlr-labelled containers on this managed Docker host."""
    from models.ai_worker import AIWorkerExecution
    from datetime import datetime, timezone
    code, output = await docker("ps", "-a", "--filter", "label=huzlr.managed-sandbox=true",
                                "--filter", f"label=huzlr.host={settings.AI_WORKER_SANDBOX_HOST_ID}",
                                "--format", '{{.ID}} {{.Names}} {{.Label "huzlr.execution"}}')
    if code:
        raise RuntimeError("Cannot reconcile managed sandboxes")
    for line in output.splitlines():
        container, name, execution_id = line.split()
        execution = await db.get(AIWorkerExecution, execution_id)
        if (execution is None or execution.status != "running" or not execution.lease_expires_at
                or execution.lease_expires_at < datetime.now(timezone.utc)
                or (execution.environment or {}).get("container") != name):
            await docker("rm", "--force", container)

#!/usr/bin/env python3
"""Private corpus backup, verification and restore; Python standard library only.

This is an operator tool, not a web endpoint. ZIP files are NOT encrypted and
their internal hashes do not authenticate the person who supplied an archive.
Keep the archive in private storage; POSIX outputs use 0600/0700. On Windows,
the operator must retain private inherited ACLs. Sessions, keys and grants are
never collected. Only the corpus database and its referenced blobs are copied.
"""
import argparse
from contextlib import closing, contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sqlite3
import stat
import sys
import tempfile
import time
import zipfile


class BackupError(Exception):
    """An invalid path, archive, database or source prevents a complete backup."""


APP_ROOT = Path(__file__).resolve().parents[1]
# The source tree is repository/platform/tools; a deployed bundle is app/tools.
# Never mistake the hosting account's home directory for the repository root.
PRIVATE_EXCLUDED_ROOTS = [APP_ROOT]
if (APP_ROOT.parent / ".git").exists():
    PRIVATE_EXCLUDED_ROOTS.append(APP_ROOT.parent)
FORMAT = "besoinavocat-corpus-backup"
CORE_TABLES = {"cases", "members", "documents", "messages", "time_entries", "audit_events"}
OPTIONAL_TABLES = {"document_imports", "document_pages"}
HEX = re.compile(r"[0-9a-f]{64}\Z")
BLOB_PATH = re.compile(r"blobs/[0-9a-f]{64}/[0-9a-f]{64}\Z")
PUBLIC_COMPONENTS = {"public", "public_html", "htdocs", "wwwroot"}
CHUNK = 1024 * 1024
MAX_MANIFEST = 64 * CHUNK
MAX_ENTRY = 8 * 1024**3
MAX_TOTAL = 128 * 1024**3
MAX_MEMBERS = 100000
MAX_DOCUMENTS = 1000000


def _inside(path, root):
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def _is_link(path, info):
    # A Windows directory junction is not always reported by is_symlink().
    return stat.S_ISLNK(info.st_mode) or getattr(info, "st_reparse_tag", 0) in (0xA0000003, 0xA000000C)


def _path(value, *, kind=None, new=False, outside_project=False):
    try:
        raw = os.fspath(value)
        if not isinstance(raw, str) or not raw or any(ord(c) < 32 for c in raw):
            raise BackupError("Invalid filesystem path.")
        candidate = Path(raw)
        if not candidate.is_absolute() or ".." in candidate.parts:
            raise BackupError("An absolute path without parent traversal is required.")
        if any(part.casefold() in PUBLIC_COMPONENTS or part.casefold() == ".git" for part in candidate.parts):
            raise BackupError("Public directories and Git metadata are not private backup storage.")
        if outside_project and any(_inside(candidate, root) for root in PRIVATE_EXCLUDED_ROOTS):
            raise BackupError("Backups and restored data must be outside the application repository.")
        for current in [*reversed(candidate.parents), candidate]:
            try:
                info = current.lstat()
            except FileNotFoundError:
                if current == candidate and new:
                    continue
                raise BackupError("The parent directory or source does not exist.")
            if _is_link(current, info):
                raise BackupError("Symbolic links and junctions are not accepted.")
        if new:
            if candidate.exists():
                raise BackupError("The destination already exists; overwrite is not allowed.")
            if not candidate.parent.is_dir():
                raise BackupError("The destination parent is not a directory.")
        else:
            info = candidate.lstat()
            if kind == "file" and not stat.S_ISREG(info.st_mode):
                raise BackupError("A regular file is required.")
            if kind == "directory" and not stat.S_ISDIR(info.st_mode):
                raise BackupError("A directory is required.")
        canonical = candidate.parent.resolve(strict=True) / candidate.name if new else candidate.resolve(strict=True)
        if os.path.normcase(str(canonical)) != os.path.normcase(str(candidate)):
            raise BackupError("The path resolves to a different location.")
        if outside_project and any(_inside(canonical, root) for root in PRIVATE_EXCLUDED_ROOTS):
            raise BackupError("Backups and restored data must be outside the application repository.")
        return canonical
    except BackupError:
        raise
    except (OSError, ValueError, TypeError) as error:
        raise BackupError("The filesystem path cannot be checked.") from error


def _fingerprint(info):
    return (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns)


@contextmanager
def _source(path):
    checked = _path(path, kind="file")
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_BINARY", 0)
    descriptor = os.open(checked, flags)
    with os.fdopen(descriptor, "rb") as stream:
        before = os.fstat(stream.fileno())
        if not stat.S_ISREG(before.st_mode) or _fingerprint(before) != _fingerprint(checked.lstat()):
            raise BackupError("The source changed while it was being opened.")
        yield stream
        if _fingerprint(os.fstat(stream.fileno())) != _fingerprint(before) or _fingerprint(checked.lstat()) != _fingerprint(before):
            raise BackupError("The source changed during the operation.")


def _exclusive_file(path):
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_BINARY", 0), 0o600)
    return os.fdopen(descriptor, "wb")


def _transfer(source, destination=None, *, expected=None, limit=MAX_ENTRY):
    digest = hashlib.sha256()
    length = 0
    while True:
        block = source.read(min(CHUNK, limit - length + 1))
        if not block:
            break
        length += len(block)
        if length > limit:
            raise BackupError("A file exceeds the supported size limit.")
        digest.update(block)
        if destination is not None:
            destination.write(block)
    record = {"sha256": digest.hexdigest(), "bytes": length}
    if expected is not None and (record["sha256"] != expected["sha256"] or record["bytes"] != expected["bytes"]):
        raise BackupError("A file does not match its SHA-256 or size.")
    return record


def _file_record(path, name):
    with _source(path) as stream:
        return {"path": name, **_transfer(stream)}


def _connect_ro(path):
    connection = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=30)
    connection.execute("PRAGMA query_only=ON")
    connection.execute("PRAGMA trusted_schema=OFF")
    connection.execute("PRAGMA foreign_keys=ON")
    deadline = time.monotonic() + 300
    connection.set_progress_handler(lambda: int(time.monotonic() > deadline), 10000)
    return connection


def _database_inventory(database):
    """Derive counts and expected blob paths from a checked, self-contained DB."""
    with closing(_connect_ro(database)) as connection:
        if connection.execute("PRAGMA integrity_check").fetchall() != [("ok",)]:
            raise BackupError("SQLite integrity_check failed.")
        if connection.execute("PRAGMA foreign_key_check").fetchone() is not None:
            raise BackupError("SQLite foreign_key_check failed.")
        definitions = connection.execute("SELECT name,sql FROM sqlite_schema WHERE type='table' AND name NOT GLOB 'sqlite_*'").fetchall()
        tables = {name for name, _ in definitions}
        if not CORE_TABLES.issubset(tables) or not tables.issubset(CORE_TABLES | OPTIONAL_TABLES):
            raise BackupError("Unsupported corpus schema; unknown tables or missing corpus tables.")
        if any(not sql or re.search(r"\bVIRTUAL\s+TABLE\b", sql, re.I) for _, sql in definitions):
            raise BackupError("Virtual or unidentified tables are not supported.")
        columns = {row[1] for row in connection.execute("PRAGMA table_info(documents)")}
        if not {"id", "tenantId", "caseId", "sha256", "bytes"}.issubset(columns):
            raise BackupError("The documents table does not match the corpus schema.")
        counts = {name: connection.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0] for name in sorted(tables)}
        if counts["documents"] > MAX_DOCUMENTS:
            raise BackupError("The database exceeds the supported document count.")
        records = {}
        for document_id, tenant, case_id, sha, size in connection.execute("SELECT id,tenantId,caseId,sha256,bytes FROM documents"):
            if (not isinstance(document_id, str) or not document_id or not isinstance(case_id, str) or not case_id or
                    not isinstance(tenant, str) or not tenant or len(tenant) > 200 or tenant != tenant.strip() or
                    any(c.isspace() or ord(c) < 32 or ord(c) == 127 for c in tenant) or
                    not isinstance(sha, str) or not HEX.fullmatch(sha) or type(size) is not int or size < 1 or size > MAX_ENTRY):
                raise BackupError("A stored document reference is malformed.")
            tenant_hash = hashlib.sha256(tenant.encode("utf-8", "strict")).hexdigest()
            name = f"blobs/{tenant_hash}/{sha}"
            record = {"path": name, "sha256": sha, "bytes": size}
            if name in records and records[name] != record:
                raise BackupError("Identical blob references disagree on their size.")
            records[name] = record
        if len(records) + 2 > MAX_MEMBERS or sum(record["bytes"] for record in records.values()) > MAX_TOTAL:
            raise BackupError("The corpus exceeds supported backup limits.")
        return counts, [records[name] for name in sorted(records)]


def _snapshot(database, destination):
    with _exclusive_file(destination):
        pass
    with closing(_connect_ro(database)) as source, closing(sqlite3.connect(destination, timeout=30)) as target:
        started = time.monotonic()
        def progress(_status, _remaining, _total):
            if time.monotonic() - started > 300:
                raise BackupError("SQLite snapshot timed out while the source was busy.")
        source.backup(target, pages=1024, progress=progress, sleep=0.05)
        # The snapshot is independently usable: no uncollected WAL sidecar.
        target.execute("PRAGMA journal_mode=DELETE")
        target.commit()
    if any(Path(str(destination) + suffix).exists() for suffix in ("-wal", "-journal")):
        raise BackupError("The snapshot still depends on a journal sidecar.")


def _zip_info(name):
    info = zipfile.ZipInfo(name)
    info.create_system = 3
    info.external_attr = (stat.S_IFREG | 0o600) << 16
    info.compress_type = zipfile.ZIP_STORED
    return info


def _safe_remove_created(path, expected_info, *, directory=False):
    """Cleanup only the exact newly created path, never an existing destination."""
    try:
        current = path.lstat()
        if _is_link(path, current) or (current.st_dev, current.st_ino) != (expected_info.st_dev, expected_info.st_ino):
            return
        _path(path, kind="directory" if directory else "file", outside_project=True)
        if directory:
            shutil.rmtree(path)
        else:
            path.unlink()
    except (OSError, BackupError):
        pass


def create_backup(database, blobs, output):
    """Copy a consistent SQLite snapshot and only blobs referenced by it."""
    created = None
    try:
        database = _path(database, kind="file")
        blobs = _path(blobs, kind="directory")
        output = _path(output, new=True, outside_project=True)
        if output.suffix.lower() != ".zip" or _inside(output, blobs):
            raise BackupError("Use a new .zip outside the source blob directory.")
        with tempfile.TemporaryDirectory(prefix="ba-corpus-snapshot-", dir=output.parent) as work:
            snapshot = Path(work) / "platform.sqlite"
            _snapshot(database, snapshot)
            counts, records = _database_inventory(snapshot)
            database_record = _file_record(snapshot, "platform.sqlite")
            if database_record["bytes"] + sum(record["bytes"] for record in records) > MAX_TOTAL:
                raise BackupError("The backup exceeds its supported total size.")
            manifest = {"format": FORMAT, "version": 1,
                        "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                        "database": database_record, "blobs": records, "counts": counts}
            manifest_bytes = json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True).encode("utf-8") + b"\n"
            if len(manifest_bytes) > MAX_MANIFEST:
                raise BackupError("The backup manifest is too large.")
            with _exclusive_file(output) as sink:
                created = os.fstat(sink.fileno())
                with zipfile.ZipFile(sink, "w", allowZip64=True) as archive:
                    with _source(snapshot) as original, archive.open(_zip_info("platform.sqlite"), "w", force_zip64=True) as member:
                        _transfer(original, member, expected=database_record)
                    for record in records:
                        original_path = blobs.joinpath(*record["path"].split("/")[1:])
                        with _source(original_path) as original, archive.open(_zip_info(record["path"]), "w", force_zip64=True) as member:
                            _transfer(original, member, expected=record, limit=record["bytes"])
                    archive.writestr(_zip_info("manifest.json"), manifest_bytes)
                sink.flush()
                os.fsync(sink.fileno())
        # Verification rereads the finished archive, not the source filesystem.
        if verify_archive(output) != manifest:
            raise BackupError("The final archive manifest differs from the snapshot.")
        return manifest
    except BackupError:
        if created is not None:
            _safe_remove_created(output, created)
        raise
    except (OSError, ValueError, TypeError, UnicodeError, sqlite3.Error, zipfile.BadZipFile, RuntimeError) as error:
        if created is not None:
            _safe_remove_created(output, created)
        raise BackupError("The backup could not be completed; sources were not modified.") from error


def _no_duplicates(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise BackupError("Duplicate JSON field in manifest.")
        value[key] = item
    return value


def _valid_record(record, *, database=False):
    if not isinstance(record, dict) or set(record) != {"path", "sha256", "bytes"}:
        return False
    name, digest, size = record["path"], record["sha256"], record["bytes"]
    return (isinstance(name, str) and (name == "platform.sqlite" if database else BLOB_PATH.fullmatch(name)) and
            isinstance(digest, str) and HEX.fullmatch(digest) and (database or name.rsplit("/", 1)[-1] == digest) and
            type(size) is int and 0 < size <= MAX_ENTRY)


def _read_manifest(archive):
    infos = archive.infolist()
    if len(infos) < 2 or len(infos) > MAX_MEMBERS:
        raise BackupError("Unexpected archive member count.")
    names = set()
    total = 0
    for info in infos:
        if (info.filename != info.orig_filename or info.filename in names or
                not (info.filename in {"manifest.json", "platform.sqlite"} or BLOB_PATH.fullmatch(info.filename))):
            raise BackupError("Unsafe, duplicate or unexpected archive member name.")
        names.add(info.filename)
        mode = info.external_attr >> 16
        if (info.is_dir() or stat.S_IFMT(mode) not in (0, stat.S_IFREG) or info.flag_bits & 1 or
                info.compress_type != zipfile.ZIP_STORED or info.file_size != info.compress_size):
            raise BackupError("Archive members must be unencrypted regular stored files.")
        limit = MAX_MANIFEST if info.filename == "manifest.json" else MAX_ENTRY
        if info.file_size <= 0 or info.file_size > limit:
            raise BackupError("Archive member size is outside supported limits.")
        total += info.file_size
    if total > MAX_TOTAL + MAX_MANIFEST or not {"manifest.json", "platform.sqlite"}.issubset(names):
        raise BackupError("Archive is incomplete or exceeds supported size limits.")
    with archive.open("manifest.json") as stream:
        raw = stream.read(MAX_MANIFEST + 1)
        if len(raw) > MAX_MANIFEST:
            raise BackupError("Archive manifest is too large.")
    manifest = json.loads(raw.decode("utf-8", "strict"), object_pairs_hook=_no_duplicates)
    if (not isinstance(manifest, dict) or set(manifest) != {"format", "version", "createdAt", "database", "blobs", "counts"} or
            manifest["format"] != FORMAT or type(manifest["version"]) is not int or manifest["version"] != 1 or
            not isinstance(manifest["createdAt"], str) or len(manifest["createdAt"]) > 40 or
            not _valid_record(manifest["database"], database=True) or not isinstance(manifest["blobs"], list) or
            not isinstance(manifest["counts"], dict)):
        raise BackupError("Invalid backup manifest format.")
    parsed_time = datetime.fromisoformat(manifest["createdAt"])
    if parsed_time.tzinfo is None:
        raise BackupError("The backup timestamp must have a timezone.")
    counts = manifest["counts"]
    if not CORE_TABLES.issubset(counts) or not set(counts).issubset(CORE_TABLES | OPTIONAL_TABLES) or any(type(n) is not int or n < 0 for n in counts.values()):
        raise BackupError("Invalid database table counts.")
    expected_names = {"manifest.json", "platform.sqlite"}
    for record in manifest["blobs"]:
        if not _valid_record(record) or record["path"] in expected_names:
            raise BackupError("Duplicate or invalid blob in manifest.")
        expected_names.add(record["path"])
    if names != expected_names:
        raise BackupError("Archive members do not match the manifest exactly.")
    for record in [manifest["database"], *manifest["blobs"]]:
        if archive.getinfo(record["path"]).file_size != record["bytes"]:
            raise BackupError("A member size differs from the manifest.")
    return manifest


def _verify_open(archive, work):
    manifest = _read_manifest(archive)
    database = work / "platform.sqlite"
    with _exclusive_file(database) as sink, archive.open("platform.sqlite") as source:
        _transfer(source, sink, expected=manifest["database"], limit=manifest["database"]["bytes"])
    counts, references = _database_inventory(database)
    if counts != manifest["counts"] or references != sorted(manifest["blobs"], key=lambda item: item["path"]):
        raise BackupError("Manifest counts or blobs differ from the SQLite snapshot.")
    for record in manifest["blobs"]:
        with archive.open(record["path"]) as source:
            _transfer(source, expected=record, limit=record["bytes"])
    return manifest


def verify_archive(archive):
    """Read every member, verify every hash/size, then SQLite integrity and FKs."""
    try:
        archive = _path(archive, kind="file", outside_project=True)
        with _source(archive) as source, zipfile.ZipFile(source, "r") as contents:
            with tempfile.TemporaryDirectory(prefix="ba-corpus-verify-") as work:
                return _verify_open(contents, _path(work, kind="directory", outside_project=True))
    except BackupError:
        raise
    except (OSError, ValueError, TypeError, UnicodeError, sqlite3.Error, zipfile.BadZipFile, RuntimeError, KeyError, EOFError) as error:
        raise BackupError("Archive verification failed.") from error


def restore_archive(archive, destination):
    """Verify fully before creating a new private directory; never overwrite."""
    created = None
    try:
        archive = _path(archive, kind="file", outside_project=True)
        destination = _path(destination, new=True, outside_project=True)
        with _source(archive) as source, zipfile.ZipFile(source, "r") as contents:
            with tempfile.TemporaryDirectory(prefix="ba-corpus-restore-check-") as work:
                manifest = _verify_open(contents, _path(work, kind="directory", outside_project=True))
            destination.mkdir(mode=0o700, exist_ok=False)
            created = destination.lstat()
            (destination / "blobs").mkdir(mode=0o700)
            for record in [manifest["database"], *manifest["blobs"]]:
                target = destination.joinpath(*record["path"].split("/"))
                if target.parent != destination:
                    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                _path(target, new=True, outside_project=True)
                with _exclusive_file(target) as sink, contents.open(record["path"]) as original:
                    _transfer(original, sink, expected=record, limit=record["bytes"])
                    sink.flush()
                    os.fsync(sink.fileno())
            # The actual restored files, including pages/triggers inside SQLite,
            # must pass the same checks before the operator may deploy them.
            counts, records = _database_inventory(destination / "platform.sqlite")
            if counts != manifest["counts"] or records != sorted(manifest["blobs"], key=lambda item: item["path"]):
                raise BackupError("Restored database inventory differs from the archive.")
            for record in [manifest["database"], *manifest["blobs"]]:
                with _source(destination.joinpath(*record["path"].split("/"))) as restored:
                    _transfer(restored, expected=record, limit=record["bytes"])
            # Keep the non-secret integrity manifest alongside the private data.
            with _exclusive_file(destination / "manifest.json") as sink:
                sink.write(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True).encode("utf-8") + b"\n")
                sink.flush()
                os.fsync(sink.fileno())
        return manifest
    except BackupError:
        if created is not None:
            _safe_remove_created(destination, created, directory=True)
        raise
    except (OSError, ValueError, TypeError, UnicodeError, sqlite3.Error, zipfile.BadZipFile, RuntimeError, KeyError, EOFError) as error:
        if created is not None:
            _safe_remove_created(destination, created, directory=True)
        raise BackupError("Restore failed; no existing destination was overwritten.") from error


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create", help="Create a new private, unencrypted ZIP backup")
    create.add_argument("--database", required=True)
    create.add_argument("--blobs", required=True)
    create.add_argument("--output", required=True)
    verify = commands.add_parser("verify", help="Verify every archive entry and SQLite integrity")
    verify.add_argument("--archive", required=True)
    restore = commands.add_parser("restore", help="Verify and restore to a new private directory")
    restore.add_argument("--archive", required=True)
    restore.add_argument("--destination", required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "create":
            manifest = create_backup(args.database, args.blobs, args.output)
        elif args.command == "verify":
            manifest = verify_archive(args.archive)
        else:
            manifest = restore_archive(args.archive, args.destination)
        print(json.dumps({"mode": args.command, "verified": True, "format": manifest["format"], "version": manifest["version"],
                          "counts": manifest["counts"], "uniqueTenantBlobs": len(manifest["blobs"]),
                          "blobBytes": sum(record["bytes"] for record in manifest["blobs"]),
                          "databaseSha256": manifest["database"]["sha256"]}, ensure_ascii=False))
        return 0
    except BackupError as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

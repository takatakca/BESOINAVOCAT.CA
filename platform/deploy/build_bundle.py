#!/usr/bin/env python3
"""Build a code-only cPanel archive from an explicit allowlist. No network calls."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

PROJECT = Path(__file__).resolve().parents[2]
ALLOWLIST = {
    'app.cjs': 'platform/deploy/passenger.cjs',
    'server.mjs': 'platform/server.mjs',
    'package.json': 'platform/package.json',
    'lib/identity.mjs': 'platform/lib/identity.mjs',
    'lib/store.mjs': 'platform/lib/store.mjs',
    'lib/validation.mjs': 'platform/lib/validation.mjs',
    'public/index.html': 'platform/public/index.html',
    'public/app.js': 'platform/public/app.js',
    'public/styles.css': 'platform/public/styles.css',
    'CPANEL-NODE.md': 'docs/CPANEL_NODE.md',
}


def build_bundle(output, project=PROJECT):
    project = Path(project).resolve(strict=True)
    output = Path(output).resolve()
    if output.suffix.lower() != '.zip':
        raise ValueError('A .zip output path is required.')
    payload = {}
    files = []
    for archive_name, source_name in sorted(ALLOWLIST.items()):
        source = project / source_name
        resolved = source.resolve(strict=True)
        if resolved != source or not resolved.is_relative_to(project) or not resolved.is_file():
            raise ValueError('Allowlisted source is not a regular file inside the project: ' + source_name)
        data = source.read_bytes()
        if not data:
            raise ValueError('Empty allowlisted source: ' + source_name)
        payload[archive_name] = data
        files.append({'path': archive_name, 'source': source_name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    manifest = {
        'schema_version': 1,
        'purpose': 'BESOINAVOCAT code-only Passenger pilot; no private data or identity credentials',
        'startup_file': 'app.cjs', 'runtime': 'Node.js >=24.19.0 <25',
        'files': files,
        'private_files_included': False,
        'excluded_by_allowlist': ['.data', '.env', '.env.*', 'private-imports', 'case documents', 'node_modules', '.git', 'logs', 'tests'],
        'remote_actions': 0,
    }
    payload['DEPLOYMENT-MANIFEST.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    output.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation: an earlier deployment artifact is never overwritten.
    with zipfile.ZipFile(output, mode='x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(payload.items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None or sorted(archive.namelist()) != sorted(payload):
            raise ValueError('Archive integrity or allowlist check failed.')
        for item in files:
            if hashlib.sha256(archive.read(item['path'])).hexdigest() != item['sha256']:
                raise ValueError('Archive SHA mismatch: ' + item['path'])
    return {'output': str(output), 'bytes': output.stat().st_size, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
            'files': len(payload), 'private_files_included': False, 'remote_actions': 0}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(build_bundle(args.output), ensure_ascii=False))

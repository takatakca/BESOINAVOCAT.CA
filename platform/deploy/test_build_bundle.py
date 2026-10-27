import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

from build_bundle import ALLOWLIST, build_bundle


class BundleTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='besoinavocat-bundle-test-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.project = self.root / 'project'
        for archive_name, source_name in ALLOWLIST.items():
            file = self.project / source_name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text('SYNTHETIC CONTENT: ' + archive_name, encoding='utf-8')

    def test_allowlist_excludes_private_data_and_records_exact_sha(self):
        for name in ['platform/.env', 'platform/.data/database.sqlite', 'platform/.data/blobs/private',
                     'platform/private-imports/dossier.json', 'platform/node_modules/package/index.js', 'platform/.git/config']:
            file = self.project / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text('SYNTHETIC PRIVATE SENTINEL', encoding='utf-8')
        output = self.root / 'bundle.zip'
        receipt = build_bundle(output, self.project)
        self.assertEqual(receipt['files'], len(ALLOWLIST) + 1)
        self.assertFalse(receipt['private_files_included'])
        with zipfile.ZipFile(output) as archive:
            self.assertEqual(set(archive.namelist()), set(ALLOWLIST) | {'DEPLOYMENT-MANIFEST.json'})
            manifest = json.loads(archive.read('DEPLOYMENT-MANIFEST.json'))
            self.assertEqual(len(manifest['files']), len(ALLOWLIST))
            for item in manifest['files']:
                content = archive.read(item['path'])
                self.assertNotIn(b'SYNTHETIC PRIVATE SENTINEL', content)
                self.assertEqual(hashlib.sha256(content).hexdigest(), item['sha256'])
                self.assertEqual(len(content), item['bytes'])

    def test_reproducible_zip_and_no_overwrite(self):
        first = self.root / 'first.zip'
        second = self.root / 'second.zip'
        build_bundle(first, self.project)
        build_bundle(second, self.project)
        self.assertEqual(first.read_bytes(), second.read_bytes())
        with self.assertRaises(FileExistsError):
            build_bundle(first, self.project)

    def test_missing_or_empty_required_source_prevents_creation(self):
        required = self.project / 'platform/server.mjs'
        required.write_text('', encoding='utf-8')
        output = self.root / 'not-created.zip'
        with self.assertRaises(ValueError):
            build_bundle(output, self.project)
        self.assertFalse(output.exists())
        required.unlink()
        with self.assertRaises(FileNotFoundError):
            build_bundle(output, self.project)
        self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()

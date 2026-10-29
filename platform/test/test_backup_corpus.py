"""Synthetic-only backup tests; Python stdlib, no production data or service."""
import hashlib
from contextlib import closing
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import unittest
import warnings
import zipfile

PROJECT = Path(__file__).resolve().parents[2]
TOOL = PROJECT / "platform/tools/backup-corpus.py"
spec = importlib.util.spec_from_file_location("backup_corpus_under_test", TOOL)
backup = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = backup
spec.loader.exec_module(backup)


def sha(data):
    return hashlib.sha256(data).hexdigest()


class BackupCorpusTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="ba-backup-synthetic-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.database = self.root / "platform.sqlite"
        self.blobs = self.root / "blobs"
        self.blobs.mkdir(mode=0o700)
        self.content = b"Synthetic original bytes: no real case.\n"
        self.digest = sha(self.content)
        self.tenant = "synthetic-tenant"
        self.blob = self.blobs / sha(self.tenant.encode()) / self.digest
        self.blob.parent.mkdir(mode=0o700)
        self.blob.write_bytes(self.content)
        self.blob.chmod(0o600)
        self.db = sqlite3.connect(self.database)
        self.addCleanup(self.db.close)
        self.db.executescript("""
          PRAGMA journal_mode=WAL;
          PRAGMA foreign_keys=ON;
          CREATE TABLE cases(id TEXT PRIMARY KEY,tenantId TEXT,title TEXT);
          CREATE TABLE members(tenantId TEXT,caseId TEXT REFERENCES cases(id),subject TEXT,role TEXT);
          CREATE TABLE documents(id TEXT PRIMARY KEY,tenantId TEXT,caseId TEXT REFERENCES cases(id),sha256 TEXT,bytes INTEGER);
          CREATE TABLE messages(id TEXT PRIMARY KEY,caseId TEXT REFERENCES cases(id),body TEXT);
          CREATE TABLE time_entries(id TEXT PRIMARY KEY,caseId TEXT REFERENCES cases(id),minutes INTEGER);
          CREATE TABLE audit_events(id TEXT PRIMARY KEY,action TEXT);
          CREATE TABLE document_imports(documentId TEXT PRIMARY KEY REFERENCES documents(id),metadataJson TEXT);
          CREATE TABLE document_pages(documentId TEXT REFERENCES documents(id),ordinal INTEGER,text TEXT,metadataJson TEXT);
          CREATE TRIGGER immutable_pages BEFORE UPDATE ON document_pages BEGIN SELECT RAISE(ABORT,'immutable'); END;
          INSERT INTO cases VALUES('case-a','synthetic-tenant','Synthetic case');
          INSERT INTO members VALUES('synthetic-tenant','case-a','subject-a','client');
          INSERT INTO messages VALUES('message-a','case-a','Synthetic message');
          INSERT INTO time_entries VALUES('time-a','case-a',15);
          INSERT INTO audit_events VALUES('event-a','synthetic.import');
        """)
        self.db.executemany("INSERT INTO documents VALUES(?,?,?,?,?)", [
            ("doc-a", self.tenant, "case-a", self.digest, len(self.content)),
            ("doc-b", self.tenant, "case-a", self.digest, len(self.content)),
        ])
        self.metadata = json.dumps({"source_nature_code": "extraction_ou_transcription", "ocr_pages_to_verify": [7], "missing_text_pages_unresolved": [8], "visual_sample_checks": [{"page": 7, "findings": "Synthetic note"}]}, ensure_ascii=False)
        self.db.execute("INSERT INTO document_imports VALUES(?,?)", ("doc-a", self.metadata))
        self.page_text = "Réparation fictive — texte exact <script>non exécuté</script>"
        self.db.execute("INSERT INTO document_pages VALUES(?,?,?,?)", ("doc-a", 1, self.page_text, '{"page":7,"method":"ocr_a_controler"}'))
        self.db.commit()
        self.database.chmod(0o600)
        self.archive = self.root / "backup.zip"

    def create(self):
        return backup.create_backup(self.database, self.blobs, self.archive)

    def repack(self, target, transform=None, extra=None):
        with zipfile.ZipFile(self.archive) as source, zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as destination:
            for item in source.infolist():
                data = source.read(item.filename)
                destination.writestr(item, transform(item.filename, data) if transform else data)
            if extra:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore", UserWarning)
                    destination.writestr(*extra)

    def test_create_verify_restore_preserves_database_pages_triggers_and_source_bytes(self):
        manifest = self.create()
        self.assertEqual(manifest["version"], 1)
        self.assertEqual(manifest["format"], "besoinavocat-corpus-backup")
        self.assertEqual(manifest["counts"]["documents"], 2)
        self.assertEqual(manifest["counts"]["document_pages"], 1)
        self.assertEqual(manifest["counts"]["document_imports"], 1)
        self.assertEqual(len(manifest["blobs"]), 1, "same bytes in one tenant are one blob, not two losses")
        self.assertEqual(backup.verify_archive(self.archive), manifest)
        destination = self.root / "restored"
        self.assertEqual(backup.restore_archive(self.archive, destination), manifest)
        restored_blob = destination / "blobs" / sha(self.tenant.encode()) / self.digest
        self.assertEqual(restored_blob.read_bytes(), self.content)
        with closing(sqlite3.connect(destination / "platform.sqlite")) as restored:
            self.assertEqual(restored.execute("PRAGMA integrity_check").fetchone()[0], "ok")
            self.assertEqual(restored.execute("PRAGMA foreign_key_check").fetchall(), [])
            self.assertEqual(restored.execute("SELECT text FROM document_pages").fetchone()[0], self.page_text)
            self.assertEqual(restored.execute("SELECT metadataJson FROM document_imports").fetchone()[0], self.metadata)
            with self.assertRaisesRegex(sqlite3.IntegrityError, "immutable"):
                restored.execute("UPDATE document_pages SET text='changed'")

    def test_wal_snapshot_includes_committed_changes_with_writer_connection_open(self):
        self.db.execute("INSERT INTO messages VALUES('message-wal','case-a','Committed in WAL')")
        self.db.commit()
        wal = Path(str(self.database) + "-wal")
        self.assertTrue(wal.exists())
        self.assertGreater(wal.stat().st_size, 0)
        manifest = self.create()
        self.assertEqual(manifest["counts"]["messages"], 2)
        backup.restore_archive(self.archive, self.root / "wal-restored")
        with closing(sqlite3.connect(self.root / "wal-restored/platform.sqlite")) as restored:
            self.assertEqual(restored.execute("SELECT body FROM messages WHERE id='message-wal'").fetchone()[0], "Committed in WAL")

    def test_real_communications_schema_round_trip_preserves_approved_usage_and_triggers(self):
        # Build the fixture through the real Node modules, not a second copy of
        # their schema. CI sets up Node 24 before this Python suite.
        node = os.environ.get("BESOINAVOCAT_TEST_NODE") or shutil.which("node")
        if not node:
            self.skipTest("Node 24 is required for the real communications integration fixture")
        script = r"""
          import {pathToFileURL} from 'node:url';
          import path from 'node:path';
          const [project, directory] = process.argv.slice(1);
          const {createStore} = await import(pathToFileURL(path.join(project,'platform/lib/store.mjs')));
          const {createCommunications} = await import(pathToFileURL(path.join(project,'platform/lib/communications.mjs')));
          const store = createStore({dbPath:path.join(directory,'actual-platform.sqlite'),blobDir:path.join(directory,'actual-blobs')});
          const client={tenantId:'synthetic-backup-tenant',subject:'synthetic-client'};
          const owner={tenantId:client.tenantId,subject:'synthetic-owner'};
          const item=store.createCase(client,{title:'Synthetic backup fixture',reference:'SYNTHETIC'});
          store.provisionMembership({...owner,caseId:item.id,role:'owner'});
          let clock=Date.parse('2026-11-01T18:00:00Z');
          const api=createCommunications({db:store.db,access:store.access,audit:store.audit,clock:()=>clock,rates:{videoCentsPerMinute:100}});
          const session=api.schedule(owner,item.id,{title:'Synthetic appointment',kind:'video',scheduledAt:'2026-11-01T18:00:00Z'},'synthetic-backup-session');
          api.start(client,item.id,session.id); clock+=61000; api.end(client,item.id,session.id);
          const usage=api.listUsage(client,item.id).entries[0];
          api.approveUsage(owner,item.id,usage.id);
          store.close();
          console.log(JSON.stringify({caseId:item.id,sessionId:session.id,usageId:usage.id}));
        """
        result = subprocess.run([node, "--input-type=module", "-e", script, str(PROJECT), str(self.root)], capture_output=True, text=True, timeout=30, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        ids = json.loads(result.stdout)
        manifest = backup.create_backup(self.root / "actual-platform.sqlite", self.root / "actual-blobs", self.archive)
        for table in ("communication_sessions", "communication_timers", "communication_usage", "communication_usage_approvals"):
            self.assertEqual(manifest["counts"][table], 1)
        self.assertEqual(backup.verify_archive(self.archive), manifest)
        destination = self.root / "restored-communications"
        self.assertEqual(backup.restore_archive(self.archive, destination), manifest)
        with closing(sqlite3.connect(destination / "platform.sqlite")) as restored:
            self.assertEqual(restored.execute("PRAGMA integrity_check").fetchone()[0], "ok")
            self.assertEqual(restored.execute("PRAGMA foreign_key_check").fetchall(), [])
            self.assertEqual(restored.execute("SELECT seconds,rateCentsPerMinute,estimateCents,durationSource FROM communication_usage WHERE id=?", (ids["usageId"],)).fetchone(), (61, 100, 102, "manual_server_timer"))
            self.assertEqual(restored.execute("SELECT approvedBy FROM communication_usage_approvals WHERE usageId=?", (ids["usageId"],)).fetchone()[0], "synthetic-owner")
            for statement in ("UPDATE communication_usage SET seconds=1", "DELETE FROM communication_usage",
                              "UPDATE communication_usage_approvals SET approvedBy='changed'", "DELETE FROM communication_usage_approvals"):
                with self.assertRaisesRegex(sqlite3.IntegrityError, "append_only"):
                    restored.execute(statement)
                restored.rollback()

    def test_real_integrations_schema_round_trip_preserves_rows_and_excludes_vault_key(self):
        node = os.environ.get("BESOINAVOCAT_TEST_NODE") or shutil.which("node")
        if not node:
            self.skipTest("Node 24 is required for the real integrations fixture")
        script = r"""
          import {pathToFileURL} from 'node:url';
          import path from 'node:path';
          import {writeFileSync} from 'node:fs';
          import {randomBytes} from 'node:crypto';
          const [project, directory] = process.argv.slice(1);
          const {createStore} = await import(pathToFileURL(path.join(project,'platform/lib/store.mjs')));
          const {createCommunications} = await import(pathToFileURL(path.join(project,'platform/lib/communications.mjs')));
          const {createIntegrations,integrationConfiguration} = await import(pathToFileURL(path.join(project,'platform/lib/integrations.mjs')));
          const store=createStore({dbPath:path.join(directory,'integrations.sqlite'),blobDir:path.join(directory,'integrations-blobs')});
          const owner={tenantId:'synthetic-integration-tenant',subject:'synthetic-owner'};
          const item=store.createCase(owner,{title:'Synthetic integrations backup',reference:'SYNTHETIC'});
          store.provisionMembership({...owner,caseId:item.id,role:'owner'});
          const communications=createCommunications({db:store.db,access:store.access,audit:store.audit});
          const appointment=communications.schedule(owner,item.id,{title:'Synthetic appointment',kind:'video',scheduledAt:'2026-11-01T18:00:00Z'},'synthetic-integrations-backup');
          const keyFile=path.join(directory,'synthetic-integrations.key');
          writeFileSync(keyFile,randomBytes(32),{mode:0o600,flag:'wx'});
          const env={APP_ORIGIN:'https://portal.example.test',BESOINAVOCAT_INTEGRATIONS_KEY_FILE:keyFile,
            BESOINAVOCAT_ZOOM_CLIENT_ID:'synthetic-client-id',BESOINAVOCAT_ZOOM_CLIENT_SECRET:'synthetic-client-secret',
            BESOINAVOCAT_DOCUSIGN_CONNECT_HMAC_KEY:'synthetic-webhook-secret'};
          const fetch=async url=>{
            if(url==='https://zoom.us/oauth/token') return Response.json({access_token:'synthetic-access-token',refresh_token:'synthetic-refresh-token',expires_in:3600});
            if(url==='https://api.zoom.us/v2/users/me') return Response.json({id:'synthetic-account',email:'example@example.test'});
            if(url==='https://api.zoom.us/v2/users/me/meetings') return Response.json({id:123456789,join_url:'https://zoom.us/j/123456789'},{status:201});
            throw new Error('Unexpected provider request in synthetic-only fixture');
          };
          const api=createIntegrations({db:store.db,access:store.access,audit:store.audit,config:integrationConfiguration(env),fetch});
          const first=api.connect(owner,'zoom');
          await api.complete(owner,{state:new URL(first.authorizationUrl).searchParams.get('state'),code:'synthetic-code'});
          api.connect(owner,'zoom'); // A pending, sealed authorization is part of the snapshot too.
          await api.linkAppointment(owner,item.id,appointment.id,'zoom');
          const raw=Buffer.from(JSON.stringify({event:'synthetic.backup'}));
          const {createHmac}=await import('node:crypto');
          api.webhook('docusign',{raw,headers:{'x-docusign-signature-1':createHmac('sha256',env.BESOINAVOCAT_DOCUSIGN_CONNECT_HMAC_KEY).update(raw).digest('base64')}});
          store.close();
        """
        result = subprocess.run([node, "--input-type=module", "-e", script, str(PROJECT), str(self.root)], capture_output=True, text=True, timeout=30, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        database = self.root / "integrations.sqlite"
        tables = ("integration_meta", "integration_states", "integration_connections", "integration_links", "integration_events")
        with closing(sqlite3.connect(database)) as source:
            expected = {table: source.execute(f'SELECT * FROM "{table}"').fetchall() for table in tables}
        manifest = backup.create_backup(database, self.root / "integrations-blobs", self.archive)
        for table in tables:
            self.assertEqual(manifest["counts"][table], 1)
        self.assertEqual(backup.verify_archive(self.archive), manifest)
        destination = self.root / "restored-integrations"
        self.assertEqual(backup.restore_archive(self.archive, destination), manifest)
        with closing(sqlite3.connect(destination / "platform.sqlite")) as restored:
            self.assertEqual(restored.execute("PRAGMA integrity_check").fetchone()[0], "ok")
            self.assertEqual(restored.execute("PRAGMA foreign_key_check").fetchall(), [])
            for table in tables:
                self.assertEqual(restored.execute(f'SELECT * FROM "{table}"').fetchall(), expected[table])
        with zipfile.ZipFile(self.archive) as archive:
            self.assertNotIn("synthetic-integrations.key", archive.namelist())
            snapshot = archive.read("platform.sqlite")
            self.assertNotIn(b"synthetic-access-token", snapshot)
            self.assertNotIn(b"synthetic-refresh-token", snapshot)
        self.assertTrue((self.root / "synthetic-integrations.key").exists(), "the source key is not consumed by backup")

    def test_unrecognized_tables_remain_rejected(self):
        self.db.execute("CREATE TABLE communication_unrecognized(id TEXT)")
        self.db.commit()
        with self.assertRaisesRegex(backup.BackupError, "Unsupported corpus schema"):
            self.create()
        self.assertFalse(self.archive.exists())

    def test_same_content_in_two_tenants_has_two_blobs_and_unreferenced_orphans_are_excluded(self):
        tenant = "other-synthetic-tenant"
        other = self.blobs / sha(tenant.encode()) / self.digest
        other.parent.mkdir(mode=0o700)
        other.write_bytes(self.content)
        other.chmod(0o600)
        self.db.execute("INSERT INTO cases VALUES('case-b',?,'Other synthetic case')", (tenant,))
        self.db.execute("INSERT INTO documents VALUES('doc-other',?,'case-b',?,?)", (tenant, self.digest, len(self.content)))
        self.db.commit()
        orphan = self.blob.parent / sha(b"orphan")
        orphan.write_bytes(b"orphan")
        manifest = self.create()
        self.assertEqual(manifest["counts"]["documents"], 3)
        self.assertEqual(len(manifest["blobs"]), 2)
        with zipfile.ZipFile(self.archive) as archive:
            self.assertNotIn(orphan.name, "\n".join(archive.namelist()))
            self.assertEqual(len(archive.namelist()), 4)

    def test_corrupt_or_missing_source_blob_and_foreign_key_violation_refuse_backup(self):
        self.blob.write_bytes(b"Changed bytes")
        with self.assertRaises(backup.BackupError):
            self.create()
        self.assertFalse(self.archive.exists())
        self.blob.unlink()
        with self.assertRaises(backup.BackupError):
            self.create()
        self.blob.write_bytes(self.content)
        self.db.execute("PRAGMA foreign_keys=OFF")
        self.db.execute("INSERT INTO documents VALUES('bad-fk',?,'missing-case',?,?)", (self.tenant, self.digest, len(self.content)))
        self.db.commit()
        with self.assertRaises(backup.BackupError):
            self.create()
        self.assertFalse(self.archive.exists())

    def test_archive_hash_tampering_is_detected_before_restore(self):
        self.create()
        bad = self.root / "tampered.zip"
        self.repack(bad, lambda name, data: data + b"X" if name.startswith("blobs/") else data)
        with self.assertRaises(backup.BackupError):
            backup.verify_archive(bad)
        destination = self.root / "tampered-restored"
        with self.assertRaises(backup.BackupError):
            backup.restore_archive(bad, destination)
        self.assertFalse(destination.exists())
        bad_db = self.root / "tampered-db.zip"
        self.repack(bad_db, lambda name, data: b"not-a-database" if name == "platform.sqlite" else data)
        with self.assertRaises(backup.BackupError):
            backup.verify_archive(bad_db)

    def test_malicious_zip_paths_duplicates_symlinks_and_unlisted_files_are_refused(self):
        self.create()
        for index, name in enumerate(["../escape", "/absolute", "blobs/../escape", "C:/absolute", "manifest.json", "extra-private-key"]):
            with self.subTest(name=name):
                archive = self.root / f"bad-{index}.zip"
                self.repack(archive, extra=(name, b"malicious"))
                with self.assertRaises(backup.BackupError):
                    backup.verify_archive(archive)
        link = zipfile.ZipInfo("blobs/" + "a" * 64 + "/" + "b" * 64)
        link.create_system = 3
        link.external_attr = (0o120777 << 16)
        archive = self.root / "symlink.zip"
        self.repack(archive, extra=(link, b"../../outside"))
        with self.assertRaises(backup.BackupError):
            backup.verify_archive(archive)
        self.assertFalse((self.root.parent / "escape").exists())

    def test_existing_output_or_restore_target_and_public_paths_are_refused(self):
        self.create()
        digest = sha(self.archive.read_bytes())
        with self.assertRaises(backup.BackupError):
            self.create()
        self.assertEqual(sha(self.archive.read_bytes()), digest)
        destination = self.root / "existing"
        destination.mkdir()
        with self.assertRaises(backup.BackupError):
            backup.restore_archive(self.archive, destination)
        web = self.root / "public_html"
        web.mkdir(mode=0o700)
        with self.assertRaises(backup.BackupError):
            backup.create_backup(self.database, self.blobs, web / "bad.zip")
        with self.assertRaises(backup.BackupError):
            backup.restore_archive(self.archive, web / "restored")
        with self.assertRaises(backup.BackupError):
            backup.create_backup(self.database, self.blobs, PROJECT / "backup-must-not-be-public.zip")

    def test_cli_verify_returns_success_for_synthetic_archive_and_nonzero_for_invalid_archive(self):
        self.create()
        good = subprocess.run([sys.executable, str(TOOL), "verify", "--archive", str(self.archive)], text=True, capture_output=True, check=False)
        self.assertEqual(good.returncode, 0, good.stderr)
        bad = self.root / "not-a-zip.zip"
        bad.write_bytes(b"invalid")
        rejected = subprocess.run([sys.executable, str(TOOL), "verify", "--archive", str(bad)], text=True, capture_output=True, check=False)
        self.assertNotEqual(rejected.returncode, 0)
        self.assertNotIn("Traceback", rejected.stderr)

    def test_flattened_deployment_accepts_private_sibling_and_refuses_application_directory(self):
        self.create()
        application = self.root / "application"
        tools = application / "tools"
        tools.mkdir(parents=True, mode=0o700)
        deployed = tools / "backup-corpus.py"
        shutil.copyfile(TOOL, deployed)
        private = self.root / "private"
        private.mkdir(mode=0o700)
        destination = private / "restored"
        result = subprocess.run([sys.executable, str(deployed), "restore", "--archive", str(self.archive), "--destination", str(destination)], capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((destination / "blobs" / sha(self.tenant.encode()) / self.digest).read_bytes(), self.content)
        refused = subprocess.run([sys.executable, str(deployed), "restore", "--archive", str(self.archive), "--destination", str(application / "private-not-allowed")], capture_output=True, text=True, check=False)
        self.assertNotEqual(refused.returncode, 0)
        self.assertFalse((application / "private-not-allowed").exists())


if __name__ == "__main__":
    unittest.main()

# Sync v3 deployment: mandatory client upgrade

This change is **not production-deployed**. The migrations preserve existing rows, add sync metadata and convert legacy single-ID primary keys to account-scoped `(user_id,id)` keys. The update protocol is intentionally incompatible with unconditional writes from old clients. Existing foreign-key dependencies stop the key migration with an error; no `CASCADE` or data deletion is used.

## Mandatory upgrade consequence

After `20260912110016_sync_compare_and_swap.sql` is applied, authenticated direct `UPDATE`, `DELETE`, and the update branch of `upsert` are rejected by the revision guard. Older desktop builds (including v1.4.1) cannot continue cloud updates; they must upgrade. Local practice and local data remain available. Do not apply this migration without a coordinated web, desktop and iOS-host rollout and a clear upgrade notice.

New clients require both migrations, the exposed `sync_server_clock` and `sync_compare_and_swap` RPCs, and their authenticated grants. There is deliberately no unconditional-upsert fallback. Missing schema/RPC/access errors must remain visible; local changes remain pending.

## Staging and rollout checklist

1. Export a database backup and an EchoType full ZIP containing local media. Keep the original files.
2. Apply `20260912104636_p0_sync_reliability.sql`, then `20260912110016_sync_compare_and_swap.sql` to staging only.
3. Run `supabase/tests/p0_sync_rls.sql` and `supabase/tests/p0_sync_cas.sql` against a disposable staging database. The scripts roll back fixture data. Verify hosted PostgREST RPC exposure separately; local PostgreSQL tests do not verify it.
4. Using two real authenticated devices, check concurrent edits, network interruption, conflict selection, account switching, and a legacy client's explicit upgrade error. Confirm media is described as local-only, not cloud-backed.
5. Distribute the compatible desktop build and update web/iOS-host assets; communicate the required upgrade. Coordinate the production migration with this rollout/maintenance window, not as an independent background schema change.
6. Verify per-table checkpoints, pending errors and conflict recovery with production test accounts before announcing availability.

If validation fails, pause cloud sync and retain local/ZIP backups. Do not delete tables, reset user databases, clear pending records or silently restore unconditional writes as a workaround.

## Backup container contract

Hard deletes of already-synced local rows remain pending through their persisted revision/snapshot. A pre-send revision-zero snapshot covers first-upload acknowledgement loss. CAS deletion creates a server tombstone retaining the original payload; a newer remote edit causes a review conflict instead of resurrection or silent deletion. Local apply/acknowledgement reads and writes share a Dexie transaction. Full ZIP includes this revision/deletion state, but restores it only when signed into the same account that exported it.

Full backups emitted by EchoType are classic **STORE (uncompressed)** ZIPs. Restore preflights the central and local directories before JSZip/CRC processing: at most 10,000 entries and 512 MiB total expanded payload, strict `manifest.json` / `blobs/<number>` paths, matching bounds/sizes, and no duplicate, overlapping, encrypted, ZIP64 or extension-based filenames.

Recompressed ZIPs are intentionally rejected—even if their size metadata claims to fit—to avoid attacker-controlled DEFLATE expansion. Keep and restore the original EchoType ZIP, or use legacy JSON for text-only data. SHA-256 checks still validate every referenced media payload before the atomic database restore. Credentials are excluded.

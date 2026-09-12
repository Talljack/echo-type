'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Loader2, Upload } from 'lucide-react';
import { useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BACKUP_TABLES, type BackupTables, createBackupArchive, readBackupArchive, restoreBackup } from '@/lib/backup';
import { db, LOCAL_DATABASE_CHANGED_EVENT } from '@/lib/db';
import { useI18n } from '@/lib/i18n/use-i18n';
import type { SyncConflict } from '@/lib/sync/conflict';
import { resolveSyncConflict } from '@/lib/sync/resolution';
import { IS_IOS_NATIVE_HOST, nativeShareFile, pickNativeFiles } from '@/lib/tauri';

function subscribeDatabase(listener: () => void) {
  window.addEventListener(LOCAL_DATABASE_CHANGED_EVENT, listener);
  return () => window.removeEventListener(LOCAL_DATABASE_CHANGED_EVENT, listener);
}
const getDatabase = () => db;
export function DataBackup() {
  const { messages, interfaceLanguage } = useI18n('settings');
  const zh = interfaceLanguage === 'zh';
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const activeDatabase = useSyncExternalStore(subscribeDatabase, getDatabase, getDatabase);
  const query = useLiveQuery(
    async () => ({
      database: activeDatabase,
      rows: await activeDatabase.syncConflicts.filter((row) => !row.resolvedAt).toArray(),
    }),
    [activeDatabase],
  );
  const conflicts = query?.database === activeDatabase ? query.rows : [];
  async function resolveConflict(conflict: SyncConflict, version: 'local' | 'remote') {
    await run(async () => {
      const database = db;
      if (database !== activeDatabase) throw new Error('Account changed. Review the current account again.');
      if ((await resolveSyncConflict(database, conflict, version)) === 'stale')
        throw new Error(
          zh
            ? '此记录已有新修改，已保留修改并更新待确认版本，请重新检查。'
            : 'This record changed. Your newer edit was preserved; review the refreshed versions again.',
        );
      setStatus(
        zh
          ? '已选择版本；两个历史副本仍保留在完整备份中。'
          : 'Version selected. Both historical copies remain in your full backup.',
      );
    });
  }
  async function download(blob: Blob, filename: string) {
    if (await nativeShareFile(blob, filename)) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function exportData(full: boolean) {
    await run(async () => {
      const database = db;
      const date = new Date().toISOString().slice(0, 10);
      if (!full) {
        await download(
          new Blob([JSON.stringify(await database.contents.toArray())], { type: 'application/json' }),
          `echotype-library-${date}.json`,
        );
      } else {
        const tables: BackupTables = {};
        await database.transaction(
          'r',
          BACKUP_TABLES.map((name) => database.table(name)),
          async () => {
            for (const name of BACKUP_TABLES) tables[name] = await database.table(name).toArray();
          },
        );
        const bytes = await createBackupArchive(tables, database.name);
        await download(
          new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' }),
          `echotype-full-backup-${date}.zip`,
        );
      }
      setStatus(zh ? '备份已导出，请妥善保存。' : 'Backup exported. Keep it in a safe place.');
    });
  }
  async function exportLearning() {
    await run(async () => {
      const database = db;
      const data: BackupTables = {};
      await database.transaction('r', [database.records, database.sessions, database.learningAttempts], async () => {
        for (const name of ['records', 'sessions', 'learningAttempts'])
          data[name] = await database.table(name).toArray();
      });
      await download(
        new Blob([JSON.stringify(data)], { type: 'application/json' }),
        `echotype-learning-${new Date().toISOString().slice(0, 10)}.json`,
      );
      setStatus(zh ? '学习记录已导出。' : 'Learning records exported.');
    });
  }
  async function importFile(file: File) {
    await run(async () => {
      const database = db;
      const tables = await readBackupArchive(new Uint8Array(await file.arrayBuffer()), database.name);
      if (database !== db) throw new Error('Account changed. Select the backup again.');
      const result = await restoreBackup(database, tables);
      setStatus(
        zh
          ? `已恢复 ${result.total} 项，保留 ${result.skipped} 项本机较新或相同的记录。刷新页面以重新加载。`
          : `Restored ${result.total} items; kept ${result.skipped} newer or identical local items. Reload to refresh your data.`,
      );
    });
  }
  async function chooseFile() {
    if (IS_IOS_NATIVE_HOST) {
      const files = await pickNativeFiles({ accept: '.zip,.json' });
      if (files?.[0]) {
        await importFile(files[0]);
        return;
      }
    }
    input.current?.click();
  }
  return (
    <div className="space-y-4">
      {!!conflicts?.length && (
        <Card className="border-amber-200">
          <CardContent className="space-y-3 pt-5">
            <h3 className="font-semibold">
              {zh ? '待确认的同步版本' : 'Sync versions to review'} ({conflicts.length})
            </h3>
            <p className="text-sm text-slate-600">
              {zh
                ? '检测到不同设备的修改，两个版本已保留。请检查并选择要继续使用的版本。'
                : 'Different device edits were detected. Both versions are preserved. Review and choose the version to continue using.'}
            </p>
            {conflicts.map((conflict) => (
              <details key={conflict.id} className="rounded-lg border border-slate-200 p-3">
                <summary className="cursor-pointer text-sm">
                  {String(conflict.local.title ?? conflict.entityId)}
                </summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {(['local', 'remote'] as const).map((version) => (
                    <div key={version}>
                      <pre className="mb-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs">
                        {JSON.stringify(conflict[version], null, 2)}
                      </pre>
                      <Button
                        disabled={busy}
                        size="sm"
                        variant="outline"
                        onClick={() => void resolveConflict(conflict, version)}
                      >
                        {version === 'local'
                          ? zh
                            ? '使用本机版本'
                            : 'Use local version'
                          : zh
                            ? '使用云端版本'
                            : 'Use cloud version'}
                      </Button>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </CardContent>
        </Card>
      )}
      <Card className="border-slate-100 bg-white">
        <CardContent className="space-y-4 pt-5">
          <h3 className="font-semibold text-indigo-900">{messages.dataBackup.exportFullBackup}</h3>
          <p className="text-sm leading-relaxed text-slate-600">
            {zh
              ? 'ZIP 包包含学习资料、记录、课程、每日任务、导入任务和本机音视频，并校验文件完整性。最多 512 MB。不会导出 API 密钥或登录凭据。'
              : 'ZIP includes materials, progress, courses, daily tasks, import jobs and local media with integrity checks. Maximum 512 MB. API keys and login credentials are excluded.'}
          </p>
          <p className="text-sm text-slate-600">
            {zh
              ? '云同步仅同步文字和学习记录，音视频目前仅在本机；请用 ZIP 备份转移。'
              : 'Cloud sync covers text and learning records. Media remains on this device; transfer it with a ZIP backup.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} onClick={() => void exportData(true)}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {zh ? '导出完整 ZIP' : 'Export full ZIP'}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void exportData(false)}>
              {messages.dataBackup.exportLibrary}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void exportLearning()}>
              {messages.dataBackup.exportLearningData}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="border-slate-100 bg-white">
        <CardContent className="space-y-4 pt-5">
          <h3 className="font-semibold text-indigo-900">{messages.dataBackup.importFromBackup}</h3>
          <p className="text-sm leading-relaxed text-slate-600">
            {zh
              ? '支持 ZIP 和旧版 JSON。先校验再整体恢复；始终合并并保留本机较新记录，不清空数据，也不恢复旧备份里的密钥。'
              : 'Accepts ZIP and legacy JSON. Validates before atomic restoration; merges without clearing data or overwriting newer local records. Old backed-up keys are not restored.'}
          </p>
          <Button variant="outline" disabled={busy} onClick={() => void chooseFile()}>
            <Upload className="mr-2 h-4 w-4" />
            {zh ? '选择 ZIP / JSON 备份' : 'Choose ZIP / JSON backup'}
          </Button>
          <input
            ref={input}
            type="file"
            accept=".zip,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importFile(file);
              event.target.value = '';
            }}
          />
        </CardContent>
      </Card>
      {status && <output className="block text-sm text-green-700">{status}</output>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

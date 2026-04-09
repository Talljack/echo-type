'use client';

import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Database,
  Download,
  HardDrive,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/db';
import { useI18n } from '@/lib/i18n/use-i18n';

const BACKUP_SCHEMA_VERSION = 1;

const SETTINGS_KEYS = [
  'echotype_practice_translation',
  'echotype_tts_settings',
  'echotype_shortcut_store',
  'echotype_daily_plan',
  'echotype_chat_store',
  'echotype_language',
  'echotype_assessment',
  'echotype_provider_store',
];

export function DataBackup() {
  const { messages } = useI18n('settings');
  const { messages: common } = useI18n('common');
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [mergeMode, setMergeMode] = useState<'merge' | 'overwrite'>('merge');

  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExportLibrary = async () => {
    const contents = await db.contents.toArray();
    downloadJson(contents, `echotype-library-${new Date().toISOString().slice(0, 10)}.json`);
    setExportStatus(messages.dataBackup.exportedItems.replace('{{count}}', String(contents.length)));
    setTimeout(() => setExportStatus(null), 3000);
  };

  const handleExportLearning = async () => {
    const records = await db.records.toArray();
    const sessions = await db.sessions.toArray();
    downloadJson({ records, sessions }, `echotype-learning-${new Date().toISOString().slice(0, 10)}.json`);
    setExportStatus(
      messages.dataBackup.exportedRecordsSessions
        .replace('{{records}}', String(records.length))
        .replace('{{sessions}}', String(sessions.length)),
    );
    setTimeout(() => setExportStatus(null), 3000);
  };

  const handleExportFull = async () => {
    const [contents, records, sessions, books, conversations, favorites, favoriteFolders, lookupHistory] =
      await Promise.all([
        db.contents.toArray(),
        db.records.toArray(),
        db.sessions.toArray(),
        db.books.toArray(),
        db.conversations.toArray(),
        db.favorites.toArray(),
        db.favoriteFolders.toArray(),
        db.lookupHistory.toArray(),
      ]);

    const settings: Record<string, unknown> = {};
    for (const key of SETTINGS_KEYS) {
      try {
        const val = localStorage.getItem(key);
        if (val) settings[key] = JSON.parse(val);
      } catch {
        /* skip invalid */
      }
    }

    const backup = {
      _echotype_backup: true,
      _version: BACKUP_SCHEMA_VERSION,
      _exportedAt: new Date().toISOString(),
      contents,
      records,
      sessions,
      books,
      conversations,
      favorites,
      favoriteFolders,
      lookupHistory,
      settings,
    };

    const total =
      contents.length +
      records.length +
      sessions.length +
      books.length +
      conversations.length +
      favorites.length +
      favoriteFolders.length +
      lookupHistory.length;

    downloadJson(backup, `echotype-full-backup-${new Date().toISOString().slice(0, 10)}.json`);
    setExportStatus(
      messages.dataBackup.exportedFullBackup.replace('{{tables}}', '8').replace('{{total}}', String(total)),
    );
    setTimeout(() => setExportStatus(null), 4000);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportStatus(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data._echotype_backup) {
        const modeLabel = mergeMode === 'merge' ? messages.dataBackup.merge : messages.dataBackup.overwrite;
        let total = 0;
        let tables = 0;

        async function restoreTable(table: import('dexie').Table, items: unknown[] | undefined) {
          if (!items?.length) return;
          if (mergeMode === 'overwrite') await table.clear();
          await table.bulkPut(items);
          total += items.length;
          tables++;
        }

        await restoreTable(db.contents, data.contents);
        await restoreTable(db.records, data.records);
        await restoreTable(db.sessions, data.sessions);
        await restoreTable(db.books, data.books);
        await restoreTable(db.conversations, data.conversations);
        await restoreTable(db.favorites, data.favorites);
        await restoreTable(db.favoriteFolders, data.favoriteFolders);
        await restoreTable(db.lookupHistory, data.lookupHistory);

        if (data.settings && typeof data.settings === 'object') {
          for (const [key, val] of Object.entries(data.settings)) {
            if (SETTINGS_KEYS.includes(key)) {
              localStorage.setItem(key, JSON.stringify(val));
            }
          }
        }

        setImportStatus(
          messages.dataBackup.importedFullBackup
            .replace('{{tables}}', String(tables))
            .replace('{{total}}', String(total))
            .replace('{{mode}}', modeLabel),
        );
      } else if (Array.isArray(data)) {
        if (mergeMode === 'overwrite') await db.contents.clear();
        await db.contents.bulkPut(data);
        setImportStatus(
          messages.dataBackup.importedItems
            .replace('{{count}}', String(data.length))
            .replace('{{mode}}', mergeMode === 'merge' ? messages.dataBackup.merge : messages.dataBackup.overwrite),
        );
      } else if (data.records || data.sessions) {
        if (data.records?.length) {
          if (mergeMode === 'overwrite') await db.records.clear();
          await db.records.bulkPut(data.records);
        }
        if (data.sessions?.length) {
          if (mergeMode === 'overwrite') await db.sessions.clear();
          await db.sessions.bulkPut(data.sessions);
        }
        setImportStatus(
          messages.dataBackup.importedRecordsSessions
            .replace('{{records}}', String(data.records?.length || 0))
            .replace('{{sessions}}', String(data.sessions?.length || 0))
            .replace('{{mode}}', mergeMode === 'merge' ? messages.dataBackup.merge : messages.dataBackup.overwrite),
        );
      } else {
        setImportError(messages.dataBackup.unrecognizedFileFormat);
      }
    } catch {
      setImportError(messages.dataBackup.invalidJson);
    }

    event.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-100 bg-white">
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-indigo-600" />
              <h4 className="font-medium text-indigo-900">{messages.dataBackup.exportLibrary}</h4>
            </div>
            <p className="text-xs text-indigo-500">{messages.dataBackup.exportLibraryDescription}</p>
            <Button
              onClick={handleExportLibrary}
              variant="outline"
              className="w-full cursor-pointer border-indigo-200 text-indigo-600"
            >
              <Download className="mr-2 h-4 w-4" />
              {messages.dataBackup.exportLibrary}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-100 bg-white">
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-600" />
              <h4 className="font-medium text-indigo-900">{messages.dataBackup.exportLearningData}</h4>
            </div>
            <p className="text-xs text-indigo-500">{messages.dataBackup.exportLearningDataDescription}</p>
            <Button
              onClick={handleExportLearning}
              variant="outline"
              className="w-full cursor-pointer border-indigo-200 text-indigo-600"
            >
              <Download className="mr-2 h-4 w-4" />
              {messages.dataBackup.exportLearningData}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white">
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-indigo-600" />
              <h4 className="font-medium text-indigo-900">{messages.dataBackup.exportFullBackup}</h4>
            </div>
            <p className="text-xs text-indigo-500">{messages.dataBackup.exportFullBackupDescription}</p>
            <Button
              onClick={handleExportFull}
              variant="outline"
              className="w-full cursor-pointer border-indigo-300 text-indigo-700 font-medium"
            >
              <Download className="mr-2 h-4 w-4" />
              {messages.dataBackup.exportFullBackup}
            </Button>
          </CardContent>
        </Card>
      </div>

      {exportStatus && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <Check className="h-4 w-4" />
          <span>{exportStatus}</span>
        </div>
      )}

      <Card className="border-slate-100 bg-white">
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="h-5 w-5 text-indigo-600" />
            <h4 className="font-medium text-indigo-900">{messages.dataBackup.importFromBackup}</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-indigo-700">{messages.dataBackup.mode}</span>
            {(['merge', 'overwrite'] as const).map((mode) => (
              <Button
                key={mode}
                variant={mergeMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMergeMode(mode)}
                className={
                  mergeMode === mode
                    ? 'cursor-pointer bg-indigo-600'
                    : 'cursor-pointer border-indigo-200 text-indigo-600'
                }
              >
                {mode === 'merge' ? messages.dataBackup.merge : messages.dataBackup.overwrite}
              </Button>
            ))}
          </div>
          {mergeMode === 'overwrite' && <p className="text-xs text-red-500">{messages.dataBackup.overwriteWarning}</p>}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-indigo-200 px-4 py-3 transition-colors hover:border-indigo-400">
            <Upload className="h-5 w-5 text-indigo-400" />
            <span className="text-sm text-indigo-500">{common.actions.uploadJsonBackupFile}</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          {importStatus && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="h-4 w-4" />
              <span>{importStatus}</span>
            </div>
          )}
          {importError && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

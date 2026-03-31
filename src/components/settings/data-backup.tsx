'use client';

import { AlertCircle, ArrowDownToLine, ArrowUpFromLine, Check, Database, Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/db';
import { useI18n } from '@/lib/i18n/use-i18n';

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

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportStatus(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
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
      <div className="grid gap-4 md:grid-cols-2">
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

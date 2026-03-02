'use client';

import { AlertCircle, ArrowDownToLine, ArrowUpFromLine, Check, Database, Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/db';

export function DataBackup() {
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [mergeMode, setMergeMode] = useState<'merge' | 'overwrite'>('merge');

  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportLibrary = async () => {
    const contents = await db.contents.toArray();
    downloadJson(contents, `echotype-library-${new Date().toISOString().slice(0, 10)}.json`);
    setExportStatus(`Exported ${contents.length} items`);
    setTimeout(() => setExportStatus(null), 3000);
  };

  const handleExportLearning = async () => {
    const records = await db.records.toArray();
    const sessions = await db.sessions.toArray();
    downloadJson({ records, sessions }, `echotype-learning-${new Date().toISOString().slice(0, 10)}.json`);
    setExportStatus(`Exported ${records.length} records, ${sessions.length} sessions`);
    setTimeout(() => setExportStatus(null), 3000);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportStatus(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        if (mergeMode === 'overwrite') await db.contents.clear();
        await db.contents.bulkPut(data);
        setImportStatus(`Imported ${data.length} content items (${mergeMode})`);
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
          `Imported ${data.records?.length || 0} records, ${data.sessions?.length || 0} sessions (${mergeMode})`,
        );
      } else {
        setImportError('Unrecognized file format');
      }
    } catch {
      setImportError('Failed to parse file. Ensure it is valid JSON.');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white border-slate-100">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-indigo-600" />
              <h4 className="font-medium text-indigo-900">Export Library</h4>
            </div>
            <p className="text-xs text-indigo-500">Download all content items as JSON</p>
            <Button
              onClick={handleExportLibrary}
              variant="outline"
              className="w-full border-indigo-200 text-indigo-600 cursor-pointer"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Library
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-100">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <h4 className="font-medium text-indigo-900">Export Learning Data</h4>
            </div>
            <p className="text-xs text-indigo-500">Download records and sessions as JSON</p>
            <Button
              onClick={handleExportLearning}
              variant="outline"
              className="w-full border-indigo-200 text-indigo-600 cursor-pointer"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Learning Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {exportStatus && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <Check className="w-4 h-4" />
          <span>{exportStatus}</span>
        </div>
      )}

      <Card className="bg-white border-slate-100">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="w-5 h-5 text-indigo-600" />
            <h4 className="font-medium text-indigo-900">Import from Backup</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-indigo-700">Mode:</span>
            {(['merge', 'overwrite'] as const).map((mode) => (
              <Button
                key={mode}
                variant={mergeMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMergeMode(mode)}
                className={
                  mergeMode === mode
                    ? 'bg-indigo-600 cursor-pointer'
                    : 'border-indigo-200 text-indigo-600 cursor-pointer'
                }
              >
                {mode === 'merge' ? 'Merge' : 'Overwrite'}
              </Button>
            ))}
          </div>
          {mergeMode === 'overwrite' && (
            <p className="text-xs text-red-500">Overwrite will delete existing data before importing.</p>
          )}
          <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-indigo-200 rounded-lg cursor-pointer hover:border-indigo-400 transition-colors">
            <Upload className="w-5 h-5 text-indigo-400" />
            <span className="text-sm text-indigo-500">Upload .json backup file</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          {importStatus && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              <span>{importStatus}</span>
            </div>
          )}
          {importError && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

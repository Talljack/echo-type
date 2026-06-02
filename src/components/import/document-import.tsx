'use client';

import { ClipboardPaste, FileUp, Globe } from 'lucide-react';
import { useState } from 'react';
import { FileUploadImport } from '@/components/import/file-upload-import';
import { TextImport } from '@/components/import/text-import';
import { UrlImport } from '@/components/import/url-import';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/use-i18n';
import { nativeHaptic } from '@/lib/tauri';

type SubTab = 'paste' | 'upload' | 'url';

export function DocumentImport() {
  const [activeTab, setActiveTab] = useState<SubTab>('paste');
  const { messages } = useI18n('library');
  const m = messages.documentImport;

  const selectTab = (tab: SubTab) => {
    setActiveTab(tab);
    nativeHaptic('light');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeTab === 'paste' ? 'default' : 'outline'}
          size="sm"
          onClick={() => selectTab('paste')}
          className={
            activeTab === 'paste' ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer'
          }
        >
          <ClipboardPaste className="w-4 h-4 mr-2" />
          {m.pasteText}
        </Button>
        <Button
          variant={activeTab === 'upload' ? 'default' : 'outline'}
          size="sm"
          onClick={() => selectTab('upload')}
          className={
            activeTab === 'upload' ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer'
          }
        >
          <FileUp className="w-4 h-4 mr-2" />
          {m.uploadFile}
        </Button>
        <Button
          variant={activeTab === 'url' ? 'default' : 'outline'}
          size="sm"
          onClick={() => selectTab('url')}
          className={
            activeTab === 'url' ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer'
          }
        >
          <Globe className="w-4 h-4 mr-2" />
          {m.urlImport}
        </Button>
      </div>

      {activeTab === 'paste' && <TextImport />}
      {activeTab === 'upload' && <FileUploadImport />}
      {activeTab === 'url' && <UrlImport />}
    </div>
  );
}

'use client';

import { ClipboardPaste, FileUp, Globe } from 'lucide-react';
import { useState } from 'react';
import { FileUploadImport } from '@/components/import/file-upload-import';
import { TextImport } from '@/components/import/text-import';
import { UrlImport } from '@/components/import/url-import';
import { Button } from '@/components/ui/button';

type SubTab = 'paste' | 'upload' | 'url';

export function DocumentImport() {
  const [activeTab, setActiveTab] = useState<SubTab>('paste');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'paste' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('paste')}
          className={
            activeTab === 'paste' ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer'
          }
        >
          <ClipboardPaste className="w-4 h-4 mr-2" />
          Paste Text
        </Button>
        <Button
          variant={activeTab === 'upload' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('upload')}
          className={
            activeTab === 'upload' ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer'
          }
        >
          <FileUp className="w-4 h-4 mr-2" />
          Upload File
        </Button>
        <Button
          variant={activeTab === 'url' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('url')}
          className={
            activeTab === 'url' ? 'bg-indigo-600 cursor-pointer' : 'border-indigo-200 text-indigo-600 cursor-pointer'
          }
        >
          <Globe className="w-4 h-4 mr-2" />
          URL Import
        </Button>
      </div>

      {activeTab === 'paste' && <TextImport />}
      {activeTab === 'upload' && <FileUploadImport />}
      {activeTab === 'url' && <UrlImport />}
    </div>
  );
}

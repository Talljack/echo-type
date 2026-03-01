'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardPaste, FileUp } from 'lucide-react';
import { TextImport } from '@/components/import/text-import';
import { FileUploadImport } from '@/components/import/file-upload-import';

type SubTab = 'paste' | 'upload';

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
            activeTab === 'paste'
              ? 'bg-indigo-600 cursor-pointer'
              : 'border-indigo-200 text-indigo-600 cursor-pointer'
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
            activeTab === 'upload'
              ? 'bg-indigo-600 cursor-pointer'
              : 'border-indigo-200 text-indigo-600 cursor-pointer'
          }
        >
          <FileUp className="w-4 h-4 mr-2" />
          Upload File
        </Button>
      </div>

      {activeTab === 'paste' ? <TextImport /> : <FileUploadImport />}
    </div>
  );
}

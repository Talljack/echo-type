'use client';

import { ArrowLeft, FileText, Play, Sparkles, Upload } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IOSInlineChatButton } from '@/components/chat/ios-inline-chat-button';
import { AIGenerate } from '@/components/import/ai-generate';
import { DocumentImport } from '@/components/import/document-import';
import { MediaImport } from '@/components/import/media-import';
import {
  IOS_PAGE_CONTAINER_CLASS,
  IOS_SECTION_CARD_CLASS,
  IOS_TERTIARY_BUTTON_CLASS,
  IOSPageHeader,
} from '@/components/shared/ios-native-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/lib/i18n/use-i18n';
import { detectIOSNativeHost, nativeHaptic, reportNativeQAState } from '@/lib/tauri';
import { cn } from '@/lib/utils';

type ImportTab = 'document' | 'media' | 'ai';

export default function ImportPage() {
  const { messages } = useI18n('library');
  const ip = messages.importPage;
  const [activeTab, setActiveTab] = useState<ImportTab>('document');
  const isIOSNativeHost = detectIOSNativeHost();

  useEffect(() => {
    reportNativeQAState({
      page: 'library-import',
      activeTab,
      nativeHost: isIOSNativeHost ? 'ios' : 'web',
    });
  }, [activeTab, isIOSNativeHost]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as ImportTab);
    nativeHaptic('light');
  };

  const tabs = (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList
        className={cn(
          isIOSNativeHost
            ? 'mb-5 grid h-auto w-full grid-cols-3 gap-1 rounded-[22px] border border-slate-200/80 bg-slate-100/80 p-1'
            : 'mb-6 grid w-full grid-cols-3',
        )}
      >
        <TabsTrigger
          value="document"
          className={cn(
            'flex cursor-pointer items-center gap-2',
            isIOSNativeHost &&
              'h-11 rounded-[18px] border border-transparent text-sm font-semibold text-slate-500 data-[state=active]:border-white/80 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_10px_22px_rgba(15,23,42,0.08)]',
          )}
        >
          <FileText className="h-4 w-4" />
          <span className="truncate">{ip.tabDocument}</span>
        </TabsTrigger>
        <TabsTrigger
          value="media"
          className={cn(
            'flex cursor-pointer items-center gap-2',
            isIOSNativeHost &&
              'h-11 rounded-[18px] border border-transparent text-sm font-semibold text-slate-500 data-[state=active]:border-white/80 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_10px_22px_rgba(15,23,42,0.08)]',
          )}
        >
          <Play className="h-4 w-4" />
          <span className="truncate">{ip.tabMedia}</span>
        </TabsTrigger>
        <TabsTrigger
          value="ai"
          className={cn(
            'flex cursor-pointer items-center gap-2',
            isIOSNativeHost &&
              'h-11 rounded-[18px] border border-transparent text-sm font-semibold text-slate-500 data-[state=active]:border-white/80 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_10px_22px_rgba(15,23,42,0.08)]',
          )}
        >
          <Sparkles className="h-4 w-4" />
          <span className="truncate">{ip.tabAI}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="document" className="mt-0">
        <DocumentImport />
      </TabsContent>

      <TabsContent value="media" className="mt-0">
        <MediaImport />
      </TabsContent>

      <TabsContent value="ai" className="mt-0">
        <AIGenerate />
      </TabsContent>
    </Tabs>
  );

  return (
    <div className={isIOSNativeHost ? IOS_PAGE_CONTAINER_CLASS : 'mx-auto max-w-3xl space-y-6'}>
      {isIOSNativeHost ? (
        <IOSPageHeader
          icon={Upload}
          tone="teal"
          badge="Import"
          title={ip.title}
          description={ip.subtitle}
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Link href="/library" onClick={() => nativeHaptic('light')}>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(IOS_TERTIARY_BUTTON_CLASS, 'h-10 w-10 px-0')}
                  aria-label="Back to Library"
                  data-testid="import-back-library"
                  title="Back to Library"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <IOSInlineChatButton iconOnly />
            </div>
          }
        />
      ) : (
        <div className="flex items-center gap-4">
          <Link href="/library">
            <Button variant="ghost" size="icon" className="cursor-pointer text-indigo-600">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-[var(--font-poppins)] text-3xl font-bold text-indigo-900">{ip.title}</h1>
            <p className="mt-1 text-indigo-600">{ip.subtitle}</p>
          </div>
        </div>
      )}

      {isIOSNativeHost ? (
        <section className={cn(IOS_SECTION_CARD_CLASS, 'p-3.5')}>{tabs}</section>
      ) : (
        <Card className="border-slate-100 bg-white shadow-sm">
          <CardContent className="pt-6">{tabs}</CardContent>
        </Card>
      )}
    </div>
  );
}

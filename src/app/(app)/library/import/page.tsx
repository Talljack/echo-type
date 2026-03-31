'use client';

import { ArrowLeft, FileText, Play, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { AIGenerate } from '@/components/import/ai-generate';
import { DocumentImport } from '@/components/import/document-import';
import { MediaImport } from '@/components/import/media-import';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/lib/i18n/use-i18n';

export default function ImportPage() {
  const { messages } = useI18n('library');
  const ip = messages.importPage;
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/library">
          <Button variant="ghost" size="icon" className="text-indigo-600 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-[var(--font-poppins)] text-indigo-900">{ip.title}</h1>
          <p className="text-indigo-600 mt-1">{ip.subtitle}</p>
        </div>
      </div>

      <Card className="bg-white border-slate-100 shadow-sm">
        <CardContent className="pt-6">
          <Tabs defaultValue="document">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="document" className="flex items-center gap-2 cursor-pointer">
                <FileText className="w-4 h-4" />
                {ip.tabDocument}
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-2 cursor-pointer">
                <Play className="w-4 h-4" />
                {ip.tabMedia}
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2 cursor-pointer">
                <Sparkles className="w-4 h-4" />
                {ip.tabAI}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="document">
              <DocumentImport />
            </TabsContent>

            <TabsContent value="media">
              <MediaImport />
            </TabsContent>

            <TabsContent value="ai">
              <AIGenerate />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

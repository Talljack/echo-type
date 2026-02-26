'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, Play, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { TextImport } from '@/components/import/text-import';
import { YoutubeImport } from '@/components/import/youtube-import';
import { PdfImport } from '@/components/import/pdf-import';

export default function ImportPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/library">
          <Button variant="ghost" size="icon" className="text-indigo-600 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-[var(--font-poppins)] text-indigo-900">Import Content</h1>
          <p className="text-indigo-600 mt-1">Add English content for practice</p>
        </div>
      </div>

      <Card className="bg-white/70 backdrop-blur-xl border-indigo-100">
        <CardContent className="pt-6">
          <Tabs defaultValue="text">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="text" className="flex items-center gap-2 cursor-pointer">
                <FileText className="w-4 h-4" />
                Text
              </TabsTrigger>
              <TabsTrigger value="youtube" className="flex items-center gap-2 cursor-pointer">
                <Play className="w-4 h-4" />
                YouTube
              </TabsTrigger>
              <TabsTrigger value="pdf" className="flex items-center gap-2 cursor-pointer">
                <BookOpen className="w-4 h-4" />
                PDF / Book
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text">
              <TextImport />
            </TabsContent>

            <TabsContent value="youtube">
              <YoutubeImport />
            </TabsContent>

            <TabsContent value="pdf">
              <PdfImport />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

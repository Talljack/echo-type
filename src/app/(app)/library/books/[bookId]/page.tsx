'use client';

import { ArrowLeft, BookOpen, Headphones, MessageCircle, PenTool, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { useBookStore } from '@/stores/book-store';
import type { BookItem, ContentItem } from '@/types/content';

const difficultyColors: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

const practiceModules = [
  { key: 'listen', label: 'Listen', icon: Headphones, color: 'bg-indigo-600 hover:bg-indigo-700' },
  { key: 'speak', label: 'Speak', icon: MessageCircle, color: 'bg-teal-600 hover:bg-teal-700' },
  { key: 'read', label: 'Read', icon: BookOpen, color: 'bg-blue-600 hover:bg-blue-700' },
  { key: 'write', label: 'Write', icon: PenTool, color: 'bg-purple-600 hover:bg-purple-700' },
];

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const { loadBooks, removeBook } = useBookStore();

  const [book, setBook] = useState<BookItem | null>(null);
  const [chapters, setChapters] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    async function load() {
      await loadBooks();
      const bookData = await db.books.get(bookId);
      if (bookData) setBook(bookData);

      const category = `book-${bookId}`;
      const items = await db.contents.where('category').equals(category).sortBy('createdAt');
      setChapters(items);
      setLoading(false);
    }
    load();
  }, [bookId, loadBooks]);

  const handleRemove = async () => {
    if (!confirm('Remove this book and all its chapters from your library?')) return;
    setRemoving(true);
    await removeBook(bookId);
    router.push('/library');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-indigo-400">Loading...</div>;
  }

  if (!book) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-4">
        <p className="text-lg text-indigo-400">Book not found.</p>
        <Link href="/library">
          <Button variant="outline" className="border-indigo-200 text-indigo-600 cursor-pointer mt-2">
            Back to Library
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/library">
          <Button variant="ghost" size="icon" className="text-indigo-600 cursor-pointer shrink-0 mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-4xl">{book.coverEmoji}</span>
            <div>
              <h1 className="text-2xl font-bold text-indigo-900">{book.title}</h1>
              <p className="text-sm text-indigo-500">by {book.author}</p>
            </div>
          </div>
          <p className="text-indigo-600 mt-2">{book.description}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge className={difficultyColors[book.difficulty]} variant="secondary">
              {book.difficulty}
            </Badge>
            <Badge variant="outline" className="border-indigo-200 text-indigo-500">
              {book.chapterCount} chapters
            </Badge>
            <Badge variant="outline" className="border-indigo-200 text-indigo-500">
              {book.totalWords.toLocaleString()} words
            </Badge>
            {book.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="border-indigo-200 text-indigo-400 text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Chapter List */}
      <div>
        <h2 className="text-lg font-semibold text-indigo-900 mb-3">Chapters ({chapters.length})</h2>
        <div className="space-y-2">
          {chapters.map((ch, i) => {
            const wordCount = ch.text.split(/\s+/).filter(Boolean).length;
            return (
              <Card key={ch.id} className="bg-white border-indigo-50 hover:border-indigo-200 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-indigo-400 font-mono text-sm mt-0.5 w-8 shrink-0 text-right">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-indigo-900 truncate">{ch.title}</h3>
                      <p className="text-sm text-indigo-400 mt-0.5 line-clamp-2">{ch.text.slice(0, 150)}...</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="border-indigo-200 text-indigo-400 text-xs">
                          {wordCount} words
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {practiceModules.map((m) => (
                        <Link key={m.key} href={`/${m.key}/${ch.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-indigo-400 hover:text-indigo-600 cursor-pointer"
                            title={`Practice ${m.label}`}
                          >
                            <m.icon className="w-4 h-4" />
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Practice All - by chapter navigation */}
      <div>
        <h2 className="text-lg font-semibold text-indigo-900 mb-3">Practice All Chapters</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {practiceModules.map((m) => (
            <Link key={m.key} href={`/${m.key}/book/book-${bookId}`}>
              <Button className={cn('w-full cursor-pointer text-white', m.color)}>
                <m.icon className="w-4 h-4 mr-2" />
                {m.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Remove Book */}
      <div className="pt-4 border-t border-indigo-100">
        <Button
          variant="outline"
          onClick={handleRemove}
          disabled={removing}
          className="border-red-200 text-red-500 hover:bg-red-50 cursor-pointer"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {removing ? 'Removing...' : 'Remove Book'}
        </Button>
      </div>
    </div>
  );
}

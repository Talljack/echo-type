'use client';

import { MessageSquareText, Plus, Search, Star, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useMemo, useState } from 'react';
import { ImportDialog } from '@/components/journal/import-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useJournalStore } from '@/stores/journal-store';
import type { JournalEntry } from '@/types/journal';

function todayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function JournalList() {
  const router = useRouter();
  const journals = useJournalStore((s) => s.journals);
  const loading = useJournalStore((s) => s.loading);
  const addJournal = useJournalStore((s) => s.addJournal);

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newDate, setNewDate] = useState(todayDateKey());

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return journals;
    return journals.filter((j) => {
      const haystack = [j.title, j.topic, ...j.tags, ...j.turns.map((t) => t.text)].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [journals, deferredSearch]);

  // Group by lessonDate, newest first.
  const groups = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const j of filtered) {
      const list = map.get(j.lessonDate) ?? [];
      list.push(j);
      map.set(j.lessonDate, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const handleCreate = async () => {
    const id = await addJournal({
      title: newTitle.trim() || 'Untitled notebook',
      topic: newTopic.trim() || undefined,
      lessonDate: newDate || todayDateKey(),
    });
    setDialogOpen(false);
    setNewTitle('');
    setNewTopic('');
    setNewDate(todayDateKey());
    router.push(`/journal/${id}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Practice Notebook</h1>
          <p className="text-sm text-slate-500">
            Save phrases, dialogues, notes, and sentence sets you want to practice again.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ImportDialog
            trigger={
              <Button variant="outline">
                <Upload className="w-4 h-4" /> Import
              </Button>
            }
          />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4" /> New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create notebook</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Title (e.g. Self-introduction, Coffee phrases)"
                  autoFocus
                />
                <Input
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Topic / label (optional)"
                />
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
              <DialogFooter>
                <Button onClick={handleCreate}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notebooks, topics, tags, lines…"
          className="pl-9"
        />
      </div>

      {loading && journals.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">Loading…</p>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <MessageSquareText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{search ? 'No matching notebooks.' : 'No notebooks yet. Create your first one.'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([date, entries]) => (
            <div key={date} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{date}</h2>
              <div className="space-y-2">
                {entries.map((j) => {
                  const highlights = j.turns.filter((t) => t.highlighted).length;
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => router.push(`/journal/${j.id}`)}
                      className="w-full text-left rounded-xl border border-slate-200 bg-white p-3.5 hover:border-indigo-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900 truncate">{j.title}</span>
                        <span className="text-xs text-slate-400 shrink-0">{j.turns.length} entries</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {j.topic && <Badge variant="secondary">{j.topic}</Badge>}
                        {j.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-slate-500">
                            #{tag}
                          </Badge>
                        ))}
                        {highlights > 0 && (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {highlights}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

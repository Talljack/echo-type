'use client';

import { ChevronDown, ChevronUp, MessageSquareQuote, Plus, Search } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/use-i18n';
import { reportNativeQAState } from '@/lib/tauri';
import { flattenJournalPhrases, useJournalStore } from '@/stores/journal-store';
import { UsefulPhraseRow } from './useful-phrase-row';

export function JournalList() {
  const { messages: t } = useI18n('journal');
  const journals = useJournalStore((s) => s.journals);
  const loading = useJournalStore((s) => s.loading);
  const loaded = useJournalStore((s) => s.loaded);
  const savePhrase = useJournalStore((s) => s.savePhrase);
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [context, setContext] = useState('');
  const [tags, setTags] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState('');
  const query = useDeferredValue(search.trim().toLowerCase());
  const phrases = useMemo(() => flattenJournalPhrases(journals), [journals]);
  const allTags = useMemo(() => Array.from(new Set(phrases.flatMap((phrase) => phrase.tags))).sort(), [phrases]);
  const filtered = useMemo(
    () =>
      phrases.filter((phrase) => {
        if (tag && !phrase.tags.includes(tag)) return false;
        if (!query) return true;
        return [phrase.text, phrase.translation, phrase.context, phrase.sourceTitle, ...phrase.tags]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      }),
    [phrases, query, tag],
  );

  useEffect(() => {
    reportNativeQAState({
      page: 'journal',
      loaded,
      loading,
      phraseCount: phrases.length,
      isEmpty: filtered.length === 0,
    });
  }, [filtered.length, loaded, loading, phrases.length]);

  const handleSave = async () => {
    const value = text.trim();
    if (!value) return;
    const result = await savePhrase({
      text: value,
      translation: translation.trim() || undefined,
      context: context.trim() || undefined,
      tags: tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });
    setStatus(result.created ? t.saved : t.alreadySaved);
    setText('');
    setTranslation('');
    setContext('');
    setTags('');
  };

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
        <p className="text-sm text-slate-500">{t.description}</p>
      </header>

      <section aria-label={t.addSection} className="space-y-3 border-b border-slate-200 pb-5">
        <div className="flex gap-2">
          <Input
            aria-label={t.phrase}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) void handleSave();
            }}
            placeholder={t.phrasePlaceholder}
            autoComplete="off"
          />
          <Button aria-label={t.add} onClick={() => void handleSave()} disabled={!text.trim()}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t.add}</span>
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="px-1 text-slate-500" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? t.fewerDetails : t.addDetails}
        </Button>
        {expanded && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              aria-label={t.translation}
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder={t.translation}
            />
            <Input
              aria-label={t.topic}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={t.contextPlaceholder}
            />
            <Input
              aria-label={t.tags}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t.tagsPlaceholder}
              className="sm:col-span-2"
            />
          </div>
        )}
        {status && <output className="text-xs text-emerald-700">{status}</output>}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label={t.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search}
            className="pl-9"
          />
        </div>
        {allTags.length > 0 && (
          <select
            aria-label={t.filterByTag}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">{t.allTags}</option>
            {allTags.map((item) => (
              <option key={item} value={item}>
                #{item}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && phrases.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">{t.loading}</p>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center text-slate-400">
          <MessageSquareQuote className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">{search || tag ? t.noMatching : t.noPhrases}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {filtered.map((phrase) => (
            <UsefulPhraseRow key={`${phrase.journalId}:${phrase.turnId}`} phrase={phrase} />
          ))}
        </div>
      )}
    </main>
  );
}

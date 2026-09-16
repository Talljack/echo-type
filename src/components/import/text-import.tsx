'use client';

import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { useState } from 'react';
import { ImportActions, useImportStep } from '@/components/import/import-workbench';
import { MaterialTextEditor } from '@/components/import/material-text-editor';
import { useImportDraft } from '@/components/import/use-import-draft';
import { TagSelector } from '@/components/shared/tag-selector';
import { Button } from '@/components/ui/button';
import { publishTextDraft } from '@/lib/import-draft';
import { unitIdForContent } from '@/lib/learning-units';
import { MATERIAL_LABELS } from '@/lib/material-types';
import { normalizeTags } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language-store';
import type { ContentItem, Difficulty, MaterialType } from '@/types/content';

const inputClass =
  'mt-2 block min-h-11 w-full rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500';

export function TextImport({ onImported }: { onImported?: () => void } = {}) {
  const zh = useLanguageStore((s) => s.interfaceLanguage) === 'zh';
  const t = (en: string, cn: string) => (zh ? cn : en);
  const draft = useImportDraft('text', {
    title: '',
    text: '',
    originalText: '',
    materialType: 'reading' as MaterialType,
    typeChosen: false,
    goal: '',
    role: 'Learner',
    difficulty: 'beginner' as Difficulty,
    tags: '',
    review: false,
    savedItem: null as ContentItem | null,
  });
  const [title, setTitle] = draft.field('title');
  const [text, setText] = draft.field('text');
  const [originalText, setOriginalText] = draft.field('originalText');
  const [materialType, setMaterialType] = draft.field('materialType');
  const [typeChosen, setTypeChosen] = draft.field('typeChosen');
  const [goal, setGoal] = draft.field('goal');
  const [role, setRole] = draft.field('role');
  const [difficulty, setDifficulty] = draft.field('difficulty');
  const [tags, setTags] = draft.field('tags');
  const [review, setReview] = draft.field('review');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [savedItem, setSavedItem] = draft.field('savedItem');
  useImportStep(savedItem ? 4 : review ? 3 : 1);

  const handleImport = async () => {
    if (!text.trim() || importing || !draft.ready) return;
    setImporting(true);
    setError('');
    const now = Date.now();
    const item: ContentItem = {
      id: nanoid(),
      title: title.trim() || text.trim().slice(0, 50),
      text: text.trim(),
      type: materialType === 'sentences' ? 'sentence' : 'article',
      tags: normalizeTags(tags),
      source: 'imported',
      metadata: {
        materialType,
        originalText,
        ...(materialType === 'scenario' ? { scenario: { situation: text, role, goal } } : {}),
      },
      difficulty,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await draft.commit((revision, owner) => publishTextDraft(item, revision, owner));
      onImported?.();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t('Import failed. Your text is retained.', '导入失败，文本已保留。'),
      );
    } finally {
      setImporting(false);
    }
  };

  if (savedItem)
    return (
      <div className="space-y-5 py-5">
        <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{savedItem.title}</h3>
          <p role="status" className="mt-2 text-sm text-slate-600">
            {t('Added to your library. Your next step is learning.', '已加入资料库，接下来开始学习。')}
          </p>
        </div>
        <p className="text-sm text-slate-500">
          {MATERIAL_LABELS[materialType][zh ? 1 : 0]} · {text.trim().split(/\s+/).length} {t('words', '词')}
        </p>
        <ImportActions>
          <Button
            variant="ghost"
            onClick={() => {
              setSavedItem(null);
              setReview(false);
              setTitle('');
              setText('');
              setGoal('');
              setTypeChosen(false);
            }}
          >
            {t('Import another', '继续导入')}
          </Button>
          <Link
            className="flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition-transform active:scale-95 motion-reduce:transform-none focus-visible:ring-2"
            href={`/learn/${encodeURIComponent(unitIdForContent(savedItem))}`}
          >
            {t('Start learning', '开始学习')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </ImportActions>
      </div>
    );

  return (
    <fieldset disabled={!draft.ready || importing} className="min-w-0 space-y-5">
      <p data-testid="text-draft-status" role={draft.error ? 'alert' : 'status'} className="text-xs text-slate-500">
        {draft.error ||
          (draft.status === 'saved'
            ? t('Saved on this device', '已保存到本机')
            : draft.status === 'saving'
              ? t('Saving draft…', '正在保存草稿…')
              : t('Drafts save automatically on this device', '草稿自动保存在本机'))}
      </p>
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          {review
            ? t('Make it yours', '确认你的学习材料')
            : t('What would you like to practice?', '你想用什么内容练习？')}
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {review
            ? t('Check the content and choose how to organize it.', '校对正文，再确认材料类型。')
            : t(
                'Paste an article, a conversation, or a few useful sentences.',
                '粘贴一篇文章、一段对话，或几句实用表达。',
              )}
        </p>
      </div>
      {!review && (
        <label className="block text-sm font-medium">
          {t('Title', '标题')}
          <input
            aria-label="Import title"
            value={title}
            disabled={importing}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('e.g. Ordering coffee in English', '例如：用英语点咖啡')}
            className={inputClass}
          />
        </label>
      )}
      <div className={review ? 'grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_240px]' : ''}>
        <div className="block min-w-0 text-sm font-medium">
          {review ? t('Content preview · editable', '内容预览 · 可编辑') : t('Your text', '原文')}
          {review ? (
            <MaterialTextEditor text={text} onChange={setText} type={materialType} zh={zh} disabled={importing} />
          ) : (
            <textarea
              aria-label="Import text content"
              value={text}
              disabled={importing}
              onChange={(e) => {
                setText(e.target.value);
                setOriginalText(e.target.value);
              }}
              rows={review ? 11 : 9}
              placeholder={t('Paste your English material here…', '在这里粘贴英语材料…')}
              className={`${inputClass} resize-y text-base leading-7`}
            />
          )}
          <span className="mt-2 block text-right text-xs font-normal tabular-nums text-slate-500">
            {text.trim() ? text.trim().split(/\s+/).length : 0} {t('words', '词')}
          </span>
        </div>
        {review && (
          <div className="space-y-4 rounded-xl bg-slate-50 p-4">
            <label className="block text-sm font-medium">
              {t('Title', '标题')}
              <input
                aria-label="Import title"
                value={title}
                disabled={importing}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium">
              {t('Material type', '材料类型')}
              <select
                aria-label="Material type"
                disabled={importing}
                value={materialType}
                onChange={(e) => {
                  setMaterialType(e.target.value as MaterialType);
                  setTypeChosen(true);
                }}
                className={inputClass}
              >
                {(['reading', 'dialogue', 'sentences', 'scenario'] as const).map((kind) => (
                  <option key={kind} value={kind}>
                    {MATERIAL_LABELS[kind][zh ? 1 : 0]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              {t('Difficulty', '难度')}
              <select
                value={difficulty}
                disabled={importing}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className={inputClass}
              >
                {(['beginner', 'intermediate', 'advanced'] as const).map((d, i) => (
                  <option key={d} value={d}>
                    {zh ? ['初级', '中级', '高级'][i] : d}
                  </option>
                ))}
              </select>
            </label>
            {materialType === 'scenario' && (
              <>
                <label className="block text-sm font-medium">
                  {t('Your role', '你的角色')}
                  <input value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} />
                </label>
                <label className="block text-sm font-medium">
                  {t('Communication goal', '沟通目标')}
                  <textarea
                    aria-label="Communication goal"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder={t('What should the learner achieve?', '练习后需要完成什么？')}
                    className={inputClass}
                    rows={3}
                  />
                </label>
              </>
            )}
            <div>
              <p className="mb-2 text-sm font-medium">{t('Tags', '标签')}</p>
              <TagSelector ariaLabel={t('Tags', '标签')} value={tags} onChange={setTags} className={inputClass} />
            </div>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <ImportActions>
        {review ? (
          <>
            <Button variant="ghost" disabled={importing} onClick={() => setReview(false)}>
              <ArrowLeft className="h-4 w-4" />
              {t('Back to source', '返回来源')}
            </Button>
            <Button
              data-testid="text-import-submit"
              aria-label="Submit text import"
              onClick={() => void handleImport()}
              disabled={!text.trim() || importing || (materialType === 'scenario' && (!goal.trim() || !role.trim()))}
              className="bg-indigo-600 text-white"
            >
              {importing ? t('Adding…', '正在加入…') : t('Add to library', '加入资料库')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            disabled={!text.trim()}
            onClick={() => {
              if (!typeChosen)
                setMaterialType(
                  text.split('\n').filter((line) => /^[\w .'-]{1,30}:\s+\S/.test(line)).length >= 2
                    ? 'dialogue'
                    : 'reading',
                );
              setReview(true);
            }}
            className="bg-indigo-600 text-white"
          >
            {t('Review material', '校对材料')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </ImportActions>
    </fieldset>
  );
}

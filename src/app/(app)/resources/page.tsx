'use client';

import {
  BookOpen,
  ExternalLink,
  FileText,
  Filter,
  Github,
  Headphones,
  HeartHandshake,
  PlaySquare,
  Search,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  COMMUNITY_RESOURCES,
  RESOURCE_FORMAT_LABELS,
  RESOURCE_FORMATS,
  RESOURCE_SKILL_LABELS,
  RESOURCE_SKILLS,
  type ResourceFormat,
  type ResourceSkill,
} from '@/lib/community-resources';
import { cn } from '@/lib/utils';

const CONTRIBUTING_URL = 'https://github.com/Talljack/echo-type/blob/main/CONTRIBUTING.md';
const TEMPLATE_URL = 'https://github.com/Talljack/echo-type/blob/main/.github/resource-submission.yaml';
const formatIcons: Record<ResourceFormat, typeof BookOpen> = {
  course: BookOpen,
  website: FileText,
  video: PlaySquare,
  podcast: Headphones,
  article: FileText,
  tool: Wrench,
};

export default function CommunityResourcesPage() {
  const [format, setFormat] = useState<ResourceFormat | 'all'>('all');
  const [skill, setSkill] = useState<ResourceSkill | 'all'>('all');
  const [query, setQuery] = useState('');
  const resources = useMemo(
    () =>
      COMMUNITY_RESOURCES.filter((resource) => {
        const search =
          `${resource.title} ${resource.titleZh} ${resource.description} ${resource.descriptionZh}`.toLowerCase();
        return (
          (format === 'all' || resource.format === format) &&
          (skill === 'all' || resource.skills.includes(skill)) &&
          (!query.trim() || search.includes(query.trim().toLowerCase()))
        );
      }),
    [format, query, skill],
  );
  const chip = (selected: boolean) =>
    cn(
      'min-h-9 rounded-lg px-2.5 text-xs font-medium transition-colors active:scale-95',
      selected ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 [@media(hover:hover)]:hover:bg-indigo-50',
    );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="border-b border-indigo-100 pb-7">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-indigo-600 p-3 text-white shadow-[0_6px_16px_rgba(79,70,229,0.2)]">
            <HeartHandshake className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-indigo-600">OPEN RESOURCE DIRECTORY</p>
            <h1 className="mt-1 font-[var(--font-poppins)] text-3xl font-bold tracking-[-0.022em] text-slate-900 text-balance">
              Community learning resources
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 text-pretty">
              Trusted starting points, organised by medium and skill. Every external card opens its original publisher;
              contribute a recommendation through a reviewable, fixed format.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/library?type=scenario"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition-transform active:scale-95 [@media(hover:hover)]:hover:bg-indigo-700"
          >
            <BookOpen className="size-4" />
            Practice built-in scenarios
          </Link>
          <a
            href={CONTRIBUTING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition-transform active:scale-95 [@media(hover:hover)]:hover:bg-slate-200"
          >
            <Github className="size-4" />
            Suggest a resource on GitHub
          </a>
        </div>
      </section>
      <section className="mt-6 grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="rounded-xl bg-slate-100/70 p-4 lg:sticky lg:top-5 lg:self-start">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Filter className="size-4 text-indigo-600" />
            Find a resource
          </div>
          <label className="mt-4 flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 text-slate-500 shadow-[0_1px_3px_rgba(15,23,42,0.1)]">
            <Search className="size-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search resources"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>
          <fieldset className="mt-5">
            <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Format</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(['all', ...RESOURCE_FORMATS] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFormat(item)}
                  aria-pressed={format === item}
                  className={chip(format === item)}
                >
                  {item === 'all' ? 'All formats' : RESOURCE_FORMAT_LABELS[item].en}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-5">
            <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Skill</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(['all', ...RESOURCE_SKILLS] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSkill(item)}
                  aria-pressed={skill === item}
                  className={chip(skill === item)}
                >
                  {item === 'all' ? 'All skills' : RESOURCE_SKILL_LABELS[item].en}
                </button>
              ))}
            </div>
          </fieldset>
        </aside>
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-[var(--font-poppins)] text-xl font-bold tracking-[-0.012em] text-slate-900">
              Curated starting points
            </h2>
            <p className="text-xs font-medium tabular-nums text-slate-500">{resources.length} resources</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {resources.map((resource, index) => {
              const Icon = formatIcons[resource.format];
              return (
                <article
                  key={resource.id}
                  className={cn(
                    'group flex min-h-64 flex-col rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.1)] transition-transform [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-[0_8px_22px_rgba(15,23,42,0.12)]',
                    index === 0 && 'sm:col-span-2 sm:min-h-52',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                        <Icon className="size-4" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-indigo-600">
                        {RESOURCE_FORMAT_LABELS[resource.format].en}
                      </span>
                    </div>
                    <ExternalLink className="size-4 text-slate-400" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.012em] text-slate-900">{resource.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {resource.titleZh} · {resource.levels.join(' / ')}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{resource.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {resource.skills.map((item) => (
                      <span key={item} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        {RESOURCE_SKILL_LABELS[item].en}
                      </span>
                    ))}
                  </div>
                  {resource.scenarios.length > 0 && (
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Best for: {resource.scenarios.map((scenario) => scenario.replaceAll('-', ' ')).join(' · ')}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <span className="text-xs text-slate-400">{resource.publisher}</span>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center text-sm font-semibold text-indigo-600 transition-colors [@media(hover:hover)]:hover:text-indigo-800"
                    >
                      Open source ↗
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
          {resources.length === 0 && (
            <p className="mt-4 rounded-xl bg-slate-100 p-6 text-sm text-slate-600">
              No resources match those filters. Try another skill or format.
            </p>
          )}
        </div>
      </section>
      <section className="mt-10 rounded-xl bg-slate-950 p-6 text-slate-100 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-[var(--font-poppins)] text-xl font-bold tracking-[-0.012em]">Resource manifest</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Contributors use one fixed YAML schema: id, type, title, canonical URL, skills, levels, language,
              publisher and access licence. This keeps cards consistent and reviewable.
            </p>
          </div>
          <a
            href={TEMPLATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-900 transition-transform active:scale-95 [@media(hover:hover)]:hover:bg-indigo-50"
          >
            <FileText className="size-4" />
            Use the submission template
          </a>
        </div>
        <pre className="mt-5 overflow-x-auto rounded-lg bg-black/25 p-4 text-xs leading-6 text-indigo-100">
          <code>{`id: example-resource\nformat: podcast\ntitle: Example English Podcast\nskills: [listening, vocabulary]\nlevels: [A2, B1]\nlanguage: en-US\naccess: external-link`}</code>
        </pre>
      </section>
    </div>
  );
}

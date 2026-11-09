import type { LucideIcon } from 'lucide-react';
import { BookOpen, Headphones, Keyboard, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Skill = 'listen' | 'speak' | 'read' | 'write';

interface SkillMeta {
  icon: LucideIcon;
  en: string;
  zh: string;
  /** Solid fill (icon tiles, progress) */
  fill: string;
  /** Text / icon colour */
  ink: string;
  /** Tinted background */
  soft: string;
  /** Ring/border accent */
  ring: string;
}

/**
 * One colour per skill, used everywhere a skill appears (nav, chips,
 * progress, charts). Classes are written out in full so Tailwind can see them.
 */
export const SKILLS: Record<Skill, SkillMeta> = {
  listen: {
    icon: Headphones,
    en: 'Listen',
    zh: '听',
    fill: 'bg-listen text-on-fill',
    ink: 'text-listen-ink',
    soft: 'bg-listen-soft text-listen-ink',
    ring: 'ring-listen/30',
  },
  speak: {
    icon: Mic,
    en: 'Speak',
    zh: '说',
    fill: 'bg-speak text-on-fill',
    ink: 'text-speak-ink',
    soft: 'bg-speak-soft text-speak-ink',
    ring: 'ring-speak/30',
  },
  read: {
    icon: BookOpen,
    en: 'Read',
    zh: '读',
    fill: 'bg-read text-on-fill',
    ink: 'text-read-ink',
    soft: 'bg-read-soft text-read-ink',
    ring: 'ring-read/30',
  },
  write: {
    icon: Keyboard,
    en: 'Write',
    zh: '写',
    fill: 'bg-write text-on-fill',
    ink: 'text-write-ink',
    soft: 'bg-write-soft text-write-ink',
    ring: 'ring-write/30',
  },
};

export const SKILL_ORDER: Skill[] = ['listen', 'speak', 'read', 'write'];

export function isSkill(value: unknown): value is Skill {
  return value === 'listen' || value === 'speak' || value === 'read' || value === 'write';
}

/** Rounded tile with the skill icon — used in lists, cards and activity rows. */
export function SkillTile({
  skill,
  size = 'md',
  variant = 'soft',
  className,
}: {
  skill: Skill;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'soft' | 'solid';
  className?: string;
}) {
  const meta = SKILLS[skill];
  const Icon = meta.icon;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        size === 'sm' && 'size-7 rounded-lg [&>svg]:size-3.5',
        size === 'md' && 'size-9 rounded-xl [&>svg]:size-4',
        size === 'lg' && 'size-12 rounded-2xl [&>svg]:size-5',
        variant === 'soft' ? meta.soft : meta.fill,
        className,
      )}
    >
      <Icon />
    </span>
  );
}

/** Small pill: icon + skill label. */
export function SkillChip({
  skill,
  zh,
  label,
  className,
}: {
  skill: Skill;
  zh?: boolean;
  label?: string;
  className?: string;
}) {
  const meta = SKILLS[skill];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        meta.soft,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label ?? (zh ? meta.zh : meta.en)}
    </span>
  );
}

'use client';

import { AlertTriangle, CheckCircle2, Keyboard, RotateCcw, Wand2, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  getActiveShortcutScopes,
  getLocalizedShortcutDefinitions,
  getScopeAvailabilityDescription,
  getScopeLabel,
  getShortcutLocaleMessages,
  type ShortcutDefinition,
  type ShortcutLocale,
  type ShortcutScope,
} from '@/lib/shortcut-definitions';
import { getNormalizedShortcutKey } from '@/lib/shortcut-utils';
import { isMac } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language-store';
import { useShortcutStore } from '@/stores/shortcut-store';

type ShortcutUiMessages = ReturnType<typeof getShortcutLocaleMessages>['ui'];

type ConflictState = {
  conflictingId: string;
  message: string;
} | null;

function eventToCombo(e: KeyboardEvent): string | null {
  const parts: string[] = [];
  const mac = isMac();

  if (mac ? e.metaKey : e.ctrlKey) parts.push('mod');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');

  const key = e.key.toLowerCase();
  if (['meta', 'control', 'shift', 'alt'].includes(key)) return null;

  parts.push(getNormalizedShortcutKey(e));
  return parts.join('+');
}

function Kbd({ combo, active = false }: { combo: string; active?: boolean }) {
  const mac = isMac();
  const parts = combo
    .toLowerCase()
    .split('+')
    .map((part) => {
      switch (part) {
        case 'mod':
          return mac ? '⌘' : 'Ctrl';
        case 'shift':
          return mac ? '⇧' : 'Shift';
        case 'alt':
          return mac ? '⌥' : 'Alt';
        case 'space':
          return 'Space';
        case 'arrowleft':
          return '←';
        case 'arrowright':
          return '→';
        case 'arrowup':
          return '↑';
        case 'arrowdown':
          return '↓';
        case 'escape':
          return 'Esc';
        case 'enter':
          return '↵';
        default:
          return part.toUpperCase();
      }
    });

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {parts.map((part, i) => (
        <kbd
          key={`${combo}-${i}`}
          className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-xl border px-2.5 text-xs font-semibold shadow-sm transition-colors ${
            active
              ? 'border-indigo-500 bg-indigo-600 text-white shadow-indigo-200'
              : 'border-slate-200 bg-white text-slate-700'
          }`}
        >
          {part}
        </kbd>
      ))}
    </span>
  );
}

function ScopeAvailabilityPill({
  isCurrentlyAvailable,
  messages,
}: {
  isCurrentlyAvailable: boolean;
  messages: ShortcutUiMessages['availability'];
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        isCurrentlyAvailable
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-100 text-slate-500'
      }`}
    >
      {isCurrentlyAvailable ? messages.available : messages.unavailable}
    </span>
  );
}

function ScopeSection({
  scopeLabel,
  availabilityDescription,
  isCurrentlyAvailable,
  messages,
  children,
}: {
  scopeLabel: string;
  availabilityDescription: string;
  isCurrentlyAvailable: boolean;
  messages: ShortcutUiMessages['availability'];
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-indigo-50/60 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">{scopeLabel}</h3>
              <div className="h-px w-10 bg-gradient-to-r from-indigo-200 to-transparent" />
            </div>
            <p className="text-sm text-slate-600">{availabilityDescription}</p>
          </div>
          <div className="shrink-0">
            <ScopeAvailabilityPill isCurrentlyAvailable={isCurrentlyAvailable} messages={messages} />
          </div>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ShortcutRow({
  def,
  messages,
  effectiveKey,
  isOverridden,
  isActive,
  hasConflict,
  wasRecentlySaved,
  onRebind,
  onReset,
  onCancelRebind,
}: {
  def: ShortcutDefinition;
  messages: ShortcutUiMessages;
  effectiveKey: string;
  isOverridden: boolean;
  isActive: boolean;
  hasConflict: boolean;
  wasRecentlySaved: boolean;
  onRebind: (id: string) => void;
  onReset: (id: string) => void;
  onCancelRebind: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        hasConflict
          ? 'border-red-200 bg-red-50/70 shadow-sm shadow-red-100/60'
          : isActive
            ? 'border-indigo-300 bg-gradient-to-r from-white via-indigo-50/50 to-white shadow-lg shadow-indigo-100/70 ring-1 ring-indigo-100'
            : 'border-slate-200/80 bg-white hover:border-indigo-200 hover:shadow-sm'
      }`}
    >
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-stretch sm:p-4">
        <button
          type="button"
          onClick={() => onRebind(def.id)}
          className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400/60 sm:flex-row sm:items-center sm:justify-between"
          aria-pressed={isActive}
          aria-label={
            isActive ? `${messages.row.cancelEditing} ${def.label}` : `${messages.row.editShortcut} ${def.label}`
          }
          title={isActive ? `${messages.row.cancelEditing} ${def.label}` : `${messages.row.editShortcut} ${def.label}`}
        >
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="text-sm font-semibold text-slate-900">{def.label}</p>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  isActive
                    ? 'border-indigo-200 bg-indigo-600 text-white'
                    : isOverridden
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-slate-100 text-slate-600'
                }`}
              >
                {isActive ? messages.row.editing : isOverridden ? messages.row.custom : messages.row.default}
              </span>
              {wasRecentlySaved && !isActive && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  {messages.row.saved}
                </span>
              )}
            </div>
            <p className="max-w-[62ch] text-sm leading-6 text-slate-600">{def.description}</p>
            {isActive ? (
              <p className="text-xs font-medium text-indigo-600">{messages.row.capturingHint}</p>
            ) : hasConflict ? (
              <p className="text-xs font-medium text-red-600">{messages.row.conflict}</p>
            ) : def.requiresMod ? (
              <p className="text-xs text-slate-400">{messages.row.requiresModifier(isMac() ? 'Cmd' : 'Ctrl')}</p>
            ) : null}
          </div>

          <div className="w-full shrink-0 sm:w-auto">
            {isActive ? (
              <div className="flex min-h-[88px] w-full items-center justify-center rounded-2xl border border-dashed border-indigo-300 bg-white px-4 py-4 text-center shadow-sm sm:min-w-[188px] sm:w-auto">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-center gap-2 text-indigo-700">
                    <Keyboard className="h-4 w-4 animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                      {messages.row.capturingTitle}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-500">{messages.row.pressKeys}</p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[88px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-sm sm:min-w-[188px] sm:w-auto sm:justify-end">
                <div className="sm:hidden">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    {messages.row.current}
                  </p>
                </div>
                <Kbd combo={effectiveKey} />
              </div>
            )}
          </div>
        </button>

        <div className="flex shrink-0 flex-row items-center justify-end gap-2 sm:flex-col sm:items-end sm:justify-between">
          <button
            type="button"
            onClick={() => {
              if (isActive) {
                onCancelRebind();
                return;
              }

              onRebind(def.id);
            }}
            className={`cursor-pointer rounded-xl border p-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400/60 focus-visible:outline-none ${
              isActive
                ? 'border-indigo-200 bg-indigo-100 text-indigo-700'
                : 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
            aria-label={
              isActive ? `${messages.row.cancelEditing} ${def.label}` : `${messages.row.editShortcut} ${def.label}`
            }
            title={isActive ? messages.row.cancelEditing : messages.row.editShortcut}
          >
            {isActive ? <X className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
          </button>

          {isOverridden ? (
            <button
              type="button"
              onClick={() => onReset(def.id)}
              className="cursor-pointer rounded-xl border border-slate-200 p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-indigo-400/60 focus-visible:outline-none"
              aria-label={`${messages.row.resetToDefault} ${def.label}`}
              title={messages.row.resetToDefault}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          ) : (
            <span className="h-8 w-8" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}

function ShortcutListContent({
  locale,
  messages,
  definitions,
  rebindingId,
  conflict,
  recentlySavedId,
  onStartRebind,
  onReset,
  onCancelRebind,
}: {
  locale: ShortcutLocale;
  messages: ShortcutUiMessages;
  definitions: ShortcutDefinition[];
  rebindingId: string | null;
  conflict: ConflictState;
  recentlySavedId: string | null;
  onStartRebind: (id: string) => void;
  onReset: (id: string) => void;
  onCancelRebind: () => void;
}) {
  const { overrides, getKey } = useShortcutStore();
  const scopes: ShortcutScope[] = ['global', 'listen', 'speak', 'read', 'write'];
  const pathname = usePathname();
  const activeScopes = useMemo(() => getActiveShortcutScopes(pathname), [pathname]);

  return (
    <div className="space-y-6">
      {scopes.map((scope) => {
        const defs = definitions.filter((definition) => definition.scope === scope);
        if (defs.length === 0) return null;

        return (
          <ScopeSection
            key={scope}
            scopeLabel={getScopeLabel(scope, locale)}
            availabilityDescription={getScopeAvailabilityDescription(scope, locale)}
            isCurrentlyAvailable={activeScopes.includes(scope)}
            messages={messages.availability}
          >
            {defs.map((def) => (
              <ShortcutRow
                key={def.id}
                def={def}
                messages={messages}
                effectiveKey={getKey(def.id)}
                isOverridden={!!overrides[def.id]}
                isActive={rebindingId === def.id}
                hasConflict={conflict?.conflictingId === def.id}
                wasRecentlySaved={recentlySavedId === def.id}
                onRebind={onStartRebind}
                onReset={onReset}
                onCancelRebind={onCancelRebind}
              />
            ))}
          </ScopeSection>
        );
      })}
    </div>
  );
}

function RebindingBanner({
  localeMessages,
  activeDefinition,
  currentKey,
  conflict,
  onCancel,
}: {
  localeMessages: ShortcutUiMessages;
  activeDefinition: ShortcutDefinition | null;
  currentKey: string;
  conflict: ConflictState;
  onCancel: () => void;
}) {
  if (!activeDefinition) {
    return (
      <div className="grid gap-3 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-4 shadow-sm sm:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)] sm:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-2xl bg-indigo-600 p-2.5 text-white shadow-sm shadow-indigo-200">
            <Keyboard className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{localeMessages.summary.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {localeMessages.summary.description(isMac() ? 'Command+K' : 'Ctrl+K')}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {localeMessages.summary.search}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{isMac() ? 'Command+K' : 'Ctrl+K'}</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {localeMessages.summary.editing}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{localeMessages.summary.editAnyRow}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid gap-3 rounded-3xl border p-4 shadow-sm sm:grid-cols-[minmax(0,1.4fr)_auto] sm:items-center ${
        conflict
          ? 'border-red-200 bg-red-50'
          : 'border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-slate-50'
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {conflict ? (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          ) : (
            <Keyboard className="h-4 w-4 text-indigo-600" />
          )}
          <p className={`text-sm font-semibold ${conflict ? 'text-red-700' : 'text-slate-800'}`}>
            {activeDefinition.label}
          </p>
        </div>
        <p className={`mt-1 text-sm leading-6 ${conflict ? 'text-red-600' : 'text-slate-600'}`}>
          {conflict
            ? conflict.message
            : `${localeMessages.banner.prompt} ${
                activeDefinition.requiresMod
                  ? localeMessages.banner.requiresModifier(isMac() ? 'Cmd' : 'Ctrl')
                  : localeMessages.banner.cancelHint
              }`}
        </p>
      </div>

      <div className="flex flex-col gap-2 self-start sm:items-end">
        {!conflict && (
          <div className="rounded-2xl border border-indigo-200 bg-white/90 px-3 py-2 shadow-sm">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-400">
              {localeMessages.banner.currentBinding}
            </p>
            <Kbd combo={currentKey} active />
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="cursor-pointer border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          {localeMessages.banner.cancel}
        </Button>
      </div>
    </div>
  );
}

export function ShortcutSettings() {
  const [open, setOpen] = useState(false);
  const [rebindingId, setRebindingId] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictState>(null);
  const [recentlySavedId, setRecentlySavedId] = useState<string | null>(null);
  const interfaceLanguage = useLanguageStore((state) => state.interfaceLanguage);
  const { overrides, setOverride, clearOverride, resetAll, setPaused } = useShortcutStore();
  const commandPaletteKey = useShortcutStore((state) => state.getKey('global:command-palette'));
  const defaultSearchKeyLabel = isMac() ? 'Command+K' : 'Ctrl+K';
  const localeMessages = useMemo(() => getShortcutLocaleMessages(interfaceLanguage).ui, [interfaceLanguage]);
  const localizedDefinitions = useMemo(() => getLocalizedShortcutDefinitions(interfaceLanguage), [interfaceLanguage]);
  const activeDefinition = useMemo(
    () => localizedDefinitions.find((definition) => definition.id === rebindingId) ?? null,
    [localizedDefinitions, rebindingId],
  );

  useEffect(() => {
    setPaused(open);
    return () => {
      setPaused(false);
    };
  }, [open, setPaused]);

  useEffect(() => {
    if (open) return;
    setRebindingId(null);
    setConflict(null);
    setRecentlySavedId(null);
  }, [open]);

  useEffect(() => {
    if (!recentlySavedId) return;
    const timer = window.setTimeout(() => setRecentlySavedId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [recentlySavedId]);

  useEffect(() => {
    if (!rebindingId) return;

    const targetDef = localizedDefinitions.find((d) => d.id === rebindingId);
    if (!targetDef) return;
    const activeTarget = targetDef;

    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRebindingId(null);
        setConflict(null);
        return;
      }

      const combo = eventToCombo(e);
      if (!combo) return;

      if (activeTarget.requiresMod && !combo.split('+').includes('mod')) {
        setConflict({
          conflictingId: activeTarget.id,
          message: `${activeTarget.label} ${localeMessages.row.requiresModifier(isMac() ? 'Cmd' : 'Ctrl')}`,
        });
        return;
      }

      const conflicting = localizedDefinitions.find((definition) => {
        if (definition.id === activeTarget.id) return false;
        if (
          definition.scope !== activeTarget.scope &&
          definition.scope !== 'global' &&
          activeTarget.scope !== 'global'
        ) {
          return false;
        }
        return useShortcutStore.getState().getKey(definition.id) === combo;
      });

      if (conflicting) {
        setConflict({
          conflictingId: conflicting.id,
          message: localeMessages.banner.conflictWith(
            conflicting.label,
            getScopeLabel(conflicting.scope, interfaceLanguage),
          ),
        });
        return;
      }

      if (combo === activeTarget.defaultKey) {
        clearOverride(activeTarget.id);
      } else {
        setOverride(activeTarget.id, combo);
      }

      setRecentlySavedId(activeTarget.id);
      setRebindingId(null);
      setConflict(null);
    }

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [rebindingId, setOverride, clearOverride, localizedDefinitions, localeMessages, interfaceLanguage]);

  const handleStartRebind = (id: string) => {
    setRebindingId(id);
    setConflict(null);
    setRecentlySavedId(null);
  };

  const handleResetSingle = (id: string) => {
    clearOverride(id);
    setConflict(null);
    setRecentlySavedId(id);
    if (rebindingId === id) {
      setRebindingId(null);
    }
  };

  const handleCancelRebind = () => {
    setRebindingId(null);
    setConflict(null);
  };

  const currentActiveKey = activeDefinition ? useShortcutStore.getState().getKey(activeDefinition.id) : '';
  const currentCommandPaletteKey =
    commandPaletteKey === 'mod+k'
      ? defaultSearchKeyLabel
      : commandPaletteKey.replaceAll('mod', isMac() ? 'Command' : 'Ctrl');

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{localeMessages.summary.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {localeMessages.summary.description(defaultSearchKeyLabel)}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="cursor-pointer border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
        >
          <Keyboard className="w-4 h-4 mr-2" />
          {localeMessages.summary.configureButton}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden border border-indigo-100 bg-gradient-to-b from-white via-white to-slate-50 p-0 shadow-2xl sm:max-w-4xl">
          <DialogHeader className="shrink-0 border-b border-slate-100 px-6 pt-6 pb-5">
            <DialogTitle className="text-xl font-semibold text-slate-900">{localeMessages.modal.title}</DialogTitle>
            <DialogDescription className="max-w-2xl text-sm leading-6 text-slate-600">
              {localeMessages.modal.description(defaultSearchKeyLabel, currentCommandPaletteKey)}
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 px-6 py-4">
            <RebindingBanner
              localeMessages={localeMessages}
              activeDefinition={activeDefinition}
              currentKey={currentActiveKey}
              conflict={conflict}
              onCancel={() => {
                setRebindingId(null);
                setConflict(null);
              }}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5">
            <ShortcutListContent
              locale={interfaceLanguage}
              messages={localeMessages}
              definitions={localizedDefinitions}
              rebindingId={rebindingId}
              conflict={conflict}
              recentlySavedId={recentlySavedId}
              onStartRebind={handleStartRebind}
              onReset={handleResetSingle}
              onCancelRebind={handleCancelRebind}
            />
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-white/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">{localeMessages.footerNote}</p>
            {Object.keys(overrides).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetAll();
                  setConflict(null);
                  setRebindingId(null);
                  setRecentlySavedId(null);
                }}
                className="cursor-pointer border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                {localeMessages.summary.resetAll}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';

import { AlertTriangle, CheckCircle2, Keyboard, RotateCcw, Sparkles, Wand2, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  getActiveShortcutScopes,
  getScopeAvailabilityDescription,
  SCOPE_LABELS,
  SHORTCUT_DEFINITIONS,
  type ShortcutDefinition,
  type ShortcutScope,
} from '@/lib/shortcut-definitions';
import { getNormalizedShortcutKey } from '@/lib/shortcut-utils';
import { isMac } from '@/lib/utils';
import { useShortcutStore } from '@/stores/shortcut-store';

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

function ScopeAvailabilityPill({ isCurrentlyAvailable }: { isCurrentlyAvailable: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        isCurrentlyAvailable
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-100 text-slate-500'
      }`}
    >
      {isCurrentlyAvailable ? 'Available on this page' : 'Unavailable on this page'}
    </span>
  );
}

function ScopeSection({
  scope,
  isCurrentlyAvailable,
  children,
}: {
  scope: ShortcutScope;
  isCurrentlyAvailable: boolean;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-indigo-50/60 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">
                {SCOPE_LABELS[scope]}
              </h3>
              <div className="h-px w-10 bg-gradient-to-r from-indigo-200 to-transparent" />
            </div>
            <p className="text-sm text-slate-600">{getScopeAvailabilityDescription(scope)}</p>
          </div>
          <div className="shrink-0">
            <ScopeAvailabilityPill isCurrentlyAvailable={isCurrentlyAvailable} />
          </div>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ShortcutRow({
  def,
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
          aria-label={isActive ? `Editing ${def.label} shortcut` : `Edit ${def.label} shortcut`}
          title={isActive ? `Editing ${def.label} shortcut` : `Edit ${def.label} shortcut`}
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
                {isActive ? 'Editing' : isOverridden ? 'Custom' : 'Default'}
              </span>
              {wasRecentlySaved && !isActive && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Saved
                </span>
              )}
            </div>
            <p className="max-w-[62ch] text-sm leading-6 text-slate-600">{def.description}</p>
            {isActive ? (
              <p className="text-xs font-medium text-indigo-600">
                Capturing a new shortcut. Press <span className="font-medium">Esc</span> to cancel.
              </p>
            ) : hasConflict ? (
              <p className="text-xs font-medium text-red-600">This binding conflicts with another shortcut.</p>
            ) : def.requiresMod ? (
              <p className="text-xs text-slate-400">Requires {isMac() ? 'Cmd' : 'Ctrl'} as a modifier.</p>
            ) : null}
          </div>

          <div className="w-full shrink-0 sm:w-auto">
            {isActive ? (
              <div className="flex min-h-[88px] w-full items-center justify-center rounded-2xl border border-dashed border-indigo-300 bg-white px-4 py-4 text-center shadow-sm sm:min-w-[188px] sm:w-auto">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-center gap-2 text-indigo-700">
                    <Keyboard className="h-4 w-4 animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">Capturing</span>
                  </div>
                  <p className="text-xs text-indigo-500">Press keys</p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[88px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-sm sm:min-w-[188px] sm:w-auto sm:justify-end">
                <div className="sm:hidden">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">Current</p>
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
            aria-label={isActive ? `Cancel editing ${def.label} shortcut` : `Edit ${def.label} shortcut`}
            title={isActive ? 'Cancel editing' : 'Edit shortcut'}
          >
            {isActive ? <X className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
          </button>

          {isOverridden ? (
            <button
              type="button"
              onClick={() => onReset(def.id)}
              className="cursor-pointer rounded-xl border border-slate-200 p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-indigo-400/60 focus-visible:outline-none"
              aria-label={`Reset ${def.label} to default`}
              title="Reset to default"
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
  rebindingId,
  conflict,
  recentlySavedId,
  onStartRebind,
  onReset,
  onCancelRebind,
}: {
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
        const defs = SHORTCUT_DEFINITIONS.filter((d) => d.scope === scope);
        if (defs.length === 0) return null;

        return (
          <ScopeSection key={scope} scope={scope} isCurrentlyAvailable={activeScopes.includes(scope)}>
            {defs.map((def) => (
              <ShortcutRow
                key={def.id}
                def={def}
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
  activeDefinition,
  currentKey,
  conflict,
  onCancel,
}: {
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
            <p className="text-sm font-semibold text-slate-900">Customize shortcuts inline</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Click a row, press your key combo, and the new binding is saved immediately.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Search</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{isMac() ? 'Command+K' : 'Ctrl+K'}</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Editing</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">Tap any row</p>
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
            : `Press the new key combination now. ${activeDefinition.requiresMod ? `This action must include ${isMac() ? 'Cmd' : 'Ctrl'}.` : 'Press Esc to cancel.'}`}
        </p>
      </div>

      <div className="flex flex-col gap-2 self-start sm:items-end">
        {!conflict && (
          <div className="rounded-2xl border border-indigo-200 bg-white/90 px-3 py-2 shadow-sm">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-400">
              Current Binding
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
          Cancel
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
  const { overrides, setOverride, clearOverride, resetAll, setPaused } = useShortcutStore();
  const commandPaletteKey = useShortcutStore((state) => state.getKey('global:command-palette'));
  const defaultSearchKeyLabel = isMac() ? 'Command+K' : 'Ctrl+K';

  const activeDefinition = useMemo(() => SHORTCUT_DEFINITIONS.find((d) => d.id === rebindingId) ?? null, [rebindingId]);

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

    const targetDef = SHORTCUT_DEFINITIONS.find((d) => d.id === rebindingId);
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
          message: `“${activeTarget.label}” must include ${isMac() ? 'Cmd' : 'Ctrl'}.`,
        });
        return;
      }

      const conflicting = SHORTCUT_DEFINITIONS.find((definition) => {
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
          message: `Conflicts with “${conflicting.label}” in ${SCOPE_LABELS[conflicting.scope]}.`,
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
  }, [rebindingId, setOverride, clearOverride]);

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

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Keyboard shortcuts</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Search defaults to {defaultSearchKeyLabel}. Open the editor to customize bindings and check which scopes are
            active on the current page.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="cursor-pointer border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
        >
          <Keyboard className="w-4 h-4 mr-2" />
          Configure Shortcuts
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden border border-indigo-100 bg-gradient-to-b from-white via-white to-slate-50 p-0 shadow-2xl sm:max-w-4xl">
          <DialogHeader className="shrink-0 border-b border-slate-100 px-6 pt-6 pb-5">
            <DialogTitle className="text-xl font-semibold text-slate-900">Keyboard Shortcuts</DialogTitle>
            <DialogDescription className="max-w-2xl text-sm leading-6 text-slate-600">
              Search opens with {defaultSearchKeyLabel} by default on this device. Current binding:{' '}
              {commandPaletteKey === 'mod+k'
                ? defaultSearchKeyLabel
                : commandPaletteKey.replaceAll('mod', isMac() ? 'Command' : 'Ctrl')}
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 px-6 py-4">
            <RebindingBanner
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
              rebindingId={rebindingId}
              conflict={conflict}
              recentlySavedId={recentlySavedId}
              onStartRebind={handleStartRebind}
              onReset={handleResetSingle}
              onCancelRebind={handleCancelRebind}
            />
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-white/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              Global shortcuts may overlap with their module equivalents, but conflicting bindings inside the same
              active scope are blocked.
            </p>
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
                Reset All
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

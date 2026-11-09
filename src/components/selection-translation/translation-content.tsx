import { sanitizeSelectionSentence } from '@/lib/selection-translation-text';
import type { FavoriteType } from '@/types/favorite';

interface Props {
  type: FavoriteType;
  itemTranslation: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  pronunciation?: string;
}

export function TranslationContent({
  type,
  itemTranslation,
  exampleSentence,
  exampleTranslation,
  pronunciation,
}: Props) {
  return (
    <div className="space-y-1.5">
      {/* Item translation first */}
      <p className="text-sm font-medium text-ink">{itemTranslation}</p>

      {/* Pronunciation (words only) */}
      {type === 'word' && pronunciation && <p className="text-xs text-ink-4 font-mono">{pronunciation}</p>}

      {/* Example sentence / context below */}
      {exampleSentence && type !== 'sentence' && (
        <div className="mt-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5">
          <p className="text-xs leading-relaxed text-ink-3">{sanitizeSelectionSentence(exampleSentence)}</p>
          {exampleTranslation && <p className="mt-1 text-[11px] leading-relaxed text-ink-4">{exampleTranslation}</p>}
        </div>
      )}

      {exampleSentence && type === 'sentence' && (
        <div className="mt-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs leading-relaxed text-ink-3">
          {sanitizeSelectionSentence(exampleSentence)}
        </div>
      )}
    </div>
  );
}

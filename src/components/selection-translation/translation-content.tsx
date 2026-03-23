import type { FavoriteType } from '@/types/favorite';

interface Props {
  type: FavoriteType;
  text: string;
  translation: string;
  pronunciation?: string;
  context?: string;
}

export function TranslationContent({ type, text, translation, pronunciation, context }: Props) {
  return (
    <div className="space-y-1.5">
      {/* Pronunciation (words only) */}
      {type === 'word' && pronunciation && <p className="text-xs text-slate-400 font-mono">{pronunciation}</p>}

      {/* Translation */}
      <p className="text-sm text-slate-800">{translation}</p>

      {/* Context sentence (words and phrases) */}
      {context && type !== 'sentence' && (
        <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 text-xs text-slate-500 leading-relaxed">
          {highlightInContext(context, text)}
        </div>
      )}
    </div>
  );
}

function highlightInContext(context: string, text: string): React.ReactNode {
  const lowerContext = context.toLowerCase();
  const lowerText = text.toLowerCase();
  const idx = lowerContext.indexOf(lowerText);
  if (idx === -1) return context;

  return (
    <>
      {context.slice(0, idx)}
      <span className="font-medium text-indigo-600 underline decoration-indigo-200">
        {context.slice(idx, idx + text.length)}
      </span>
      {context.slice(idx + text.length)}
    </>
  );
}

export type PracticeModule = 'listen' | 'read' | 'speak' | 'write';

export interface PracticeTranslationPolicy {
  defaultVisible: boolean;
  allowToggle: boolean;
}

export const PRACTICE_TRANSLATION_POLICY: Record<PracticeModule, PracticeTranslationPolicy> = {
  listen: { defaultVisible: true, allowToggle: true },
  read: { defaultVisible: true, allowToggle: true },
  speak: { defaultVisible: false, allowToggle: true },
  write: { defaultVisible: false, allowToggle: true },
};

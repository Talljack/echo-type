import { parseVocabulary } from './vocabulary';

self.onmessage = (event: MessageEvent<{ source: string; reviewed: string }>) => {
  const source = parseVocabulary(event.data.source);
  self.postMessage({
    parsed: event.data.source === event.data.reviewed ? source : parseVocabulary(event.data.reviewed),
    sourceHasErrors: source.errors.length > 0,
  });
};

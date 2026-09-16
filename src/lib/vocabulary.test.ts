import { describe, expect, it } from 'vitest';
import { parseVocabulary, spellingMatches, vocabularyQueue, vocabularyRecordId, buildVocabularyTasks } from './vocabulary';
import { applyDailyEvidence, reconcileDailyTasks, selectBudgetTasks } from './daily-task-planner';
import { validateVocabularyApplication } from './vocabulary';
import type { ContentItem, LearningRecord } from '@/types/content';
const word = (id: string): ContentItem => ({ id, title:id, text:'meaning', type:'word', tags:[],source:'imported',createdAt:1,updatedAt:1 });
it('prioritizes newly imported words over untouched built-ins',()=>{
  expect(vocabularyQueue([{...word('builtin'),source:'builtin'},word('mine')],[],'meaning',1,Date.now()).map(w=>w.id)).toEqual(['mine']);
});
it('restores pending word tasks when the daily limit is raised again',()=>{
  const now=Date.now();const candidates=buildVocabularyTasks([word('a'),word('b')],[],[],2,now);
  const reduced=reconcileDailyTasks(candidates,candidates.slice(0,1),candidates[0].dateKey,now+1);
  expect(reduced[1].superseded).toBe(true);
  expect(reconcileDailyTasks(reduced,candidates,candidates[0].dateKey,now+2)[1].superseded).toBe(false);
});
it('reserves a material lesson alongside new vocabulary in a small budget',()=>{
  const now=Date.now();const words=buildVocabularyTasks([word('a'),word('b')],[],[],2,now);
  const lesson={...words[0],id:'lesson',sourceId:'lesson',vocabularyMode:undefined,stage:'understand' as const,priority:10};
  expect(selectBudgetTasks([...words,lesson],4,now).some(t=>t.id==='lesson')).toBe(true);
});
it('validates usage before freezing the answer',()=>{
  expect(validateVocabularyApplication('helpful','A helpful reply.','Email','A helpful reply.')).not.toBeNull();
  expect(validateVocabularyApplication('helpful','A useful reply to me.','Email','')).not.toBeNull();
  expect(validateVocabularyApplication('helpful','This helpful guide explains the choices.','Shopping','')).toBeNull();
});
it('permits another due review today without reusing the prior completed task',()=>{
  const now=Date.now();const base:LearningRecord={id:vocabularyRecordId('helpful','meaning'),contentId:'helpful',module:'read',attempts:2,correctCount:1,accuracy:0,lastPracticed:now-10000,nextReview:now-1,mistakes:[]};
  const old=buildVocabularyTasks([word('helpful')],[base],[],0,now)[0];
  const next=buildVocabularyTasks([word('helpful')],[{...base,lastPracticed:now,nextReview:now+600000}],[],0,now+600001);
  expect(reconcileDailyTasks([{...old,status:'completed'}],next,old.dateKey,now+600001)).toHaveLength(2);
});
describe('word book import', () => {
  it('parses quoted commas, newlines, escaped quotes and BOM headers', () => {
    const result = parseVocabulary('\uFEFFword,meaning,example,pronunciation\r\nhelpful,"有帮助的,有用的","A ""helpful""\nreply",/help/');
    expect(result.rows).toEqual([{word:'helpful',meaning:'有帮助的,有用的',example:'A "helpful"\nreply',pronunciation:'/help/'}]);
  });
  it('accepts pasted TSV and deduplicates exact entries without dropping distinct senses', () => {
    const result = parseVocabulary('单词\t释义\t例句\nHelp\t帮助\tHelp me.\nhelp\t帮助\tHelp me.\nbank\t银行\t\nbank\t河岸\t');
    expect(result.rows).toHaveLength(3); expect(result.duplicates).toBe(1);
  });
  it('reports missing meanings, broken quoting and non-English headwords', () => {
    expect(parseVocabulary('word,meaning\nhello,\n你好,hello').errors).toHaveLength(2);
    expect(parseVocabulary('word,meaning\nhello,"broken').errors.length).toBeGreaterThan(0);
  });
});
it('creates exact word tasks and ignores unrelated drill completion',()=>{
  const now=Date.now(); const tasks=buildVocabularyTasks([word('new')],[],[],10,now);
  expect(tasks[0]?.href).toContain('/library/vocabulary');
  expect(applyDailyEvidence(tasks,{sessions:[{id:'drill',contentId:'new',completed:true,startTime:now,module:'read'}]},now)[0].status).toBe('pending');
  expect(applyDailyEvidence(tasks,{records:[{id:vocabularyRecordId('new','meaning'),contentId:'new',module:'read',fsrsCard:{last_review:now}}]},now)[0].status).toBe('completed');
});
it('accepts common English apostrophes and dashes without ignoring real punctuation', () => {
  expect(spellingMatches("That's", 'That’s')).toBe(true);
  expect(spellingMatches('well-known','well‐known')).toBe(true);
  expect(spellingMatches('wellknown','well-known')).toBe(false);
});
it('prioritizes due cards, excludes deleted/future cards and enforces daily new limit', () => {
  const now = new Date(2026,8,13,12).getTime();
  const record = (id: string, due: number, attempts=1): LearningRecord => ({id:vocabularyRecordId(id,'meaning'),contentId:id,module:'read',attempts,correctCount:1,accuracy:80,lastPracticed:now-1000,nextReview:due,mistakes:[]});
  const words = [word('new'),word('due'),word('future'),{...word('deleted'),deletedAt:1}];
  expect(vocabularyQueue(words,[record('due',now-1),record('future',now+1000)],'meaning',2,now).map(w=>w.id)).toEqual(['due']);
  expect(vocabularyQueue(words,[],'meaning',2,now).map(w=>w.id)).toEqual(['new','due']);
});
import { test as limitTest, expect as limitExpect } from 'vitest';
limitTest('accepts a substantial wordbook beyond the former ten-thousand-row ceiling', () => {
  const source = 'word,meaning\n' + Array.from({ length: 12000 }, (_, i) => `word,meaning${i}`).join('\n');
  const result = parseVocabulary(source);
  limitExpect(result.errors).toEqual([]);
  limitExpect(result.rows).toHaveLength(12000);
});

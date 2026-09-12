import { describe, expect, it } from 'vitest';
import { createLearningAttempt, activityPrompt, validateLearningResponse, workshopProgress, canResolveTransfer, recordingIdentity } from './learning-activity';

describe('learning workshop evidence', () => {
  it('requires a real source quote for comprehension, not an invented answer key', () => {
    expect(validateLearningResponse('comprehension', 'We fixed the API.', 'The team fixed an API.', 'We fixed it.')).toBe('quote');
    expect(validateLearningResponse('comprehension', 'We fixed the API.', 'The team fixed an API.', 'fixed the API')).toBeNull();
  });
  it('rejects blank work and empty recordings', () => {
    expect(validateLearningResponse('writing', 'Source', '  ')).toBe('answer');
    expect(validateLearningResponse('sentence-pronunciation', 'Source', 'Source')).toBe('recording');
  });
  it('keeps revised work separate and never invents a score', () => {
    const first = createLearningAttempt({lessonId:'l',unitId:'u',activity:'writing',sourceText:'Original',sourceContentIds:['s'],answer:'My draft',notes:'Check tense'}, 10);
    const revision = createLearningAttempt({...first,answer:'My revised draft',parentAttemptId:first.id}, 20);
    expect(first.answer).toBe('My draft');
    expect(revision.id).not.toBe(first.id);
    expect(revision.status).toBe('revised');
    expect(revision.feedback.source).toBe('self');
    expect(revision).not.toHaveProperty('score');
  });
  it('uses a distinct transfer task rather than transcription', () => {
    expect(activityPrompt('personal-example', false)).toContain('your own');
    expect(activityPrompt('comprehension', false)).toContain('evidence');
  });
  it('only completes the core loop with comprehension and a genuinely revised writing draft', () => {
    const base = {lessonId:'l',unitId:'u',sourceText:'Original',sourceContentIds:['s']};
    const read = createLearningAttempt({...base,activity:'comprehension',answer:'Main idea',evidenceQuote:'Original'});
    const draft = createLearningAttempt({...base,activity:'writing',answer:'Initial draft'});
    expect(workshopProgress('l',[read,draft]).completed).toBe(false);
    const unchanged = createLearningAttempt({...draft,parentAttemptId:draft.id});
    expect(workshopProgress('l',[read,draft,unchanged]).completed).toBe(false);
    const revision = createLearningAttempt({...draft,answer:'Improved specific draft',parentAttemptId:draft.id});
    expect(workshopProgress('l',[read,draft,revision]).completed).toBe(true);
    expect(workshopProgress('other',[read,draft,revision]).completed).toBe(false);
  });
  it('requires a linked retry and a later new-context example before confirming a weak spot', () => {
    const base = {lessonId:'l',unitId:'u',sourceText:'Original',sourceContentIds:['s'],sourceWeakSpotId:'weak'};
    const first = createLearningAttempt({...base,activity:'writing',answer:'First draft'}, 2);
    const retry = createLearningAttempt({...base,activity:'writing',answer:'Changed draft',parentAttemptId:first.id}, 3);
    const example = createLearningAttempt({...base,activity:'personal-example',answer:'New context example'}, 4);
    expect(canResolveTransfer('weak',1,[first,example])).toBe(false);
    expect(canResolveTransfer('weak',1,[first,retry,example])).toBe(true);
    expect(canResolveTransfer('weak',5,[first,retry,example])).toBe(false);
  });
  it('uses stable audio identity and rejects unchanged oral submissions as retries', async () => {
    const audioId = await recordingIdentity(new Blob(['same audio']));
    expect(await recordingIdentity(new Blob(['same audio']))).toBe(audioId);
    const changedId = await recordingIdentity(new Blob(['different audio']));
    expect(changedId).not.toBe(audioId);
    const base = {lessonId:'l',unitId:'u',sourceText:'Original',sourceContentIds:['s'],sourceWeakSpotId:'weak'};
    const first = createLearningAttempt({...base,activity:'retelling',answer:'Summary',recordingId:audioId},2);
    const repeated = createLearningAttempt({...first,answer:'Edited transcript only',parentAttemptId:first.id},3);
    const example = createLearningAttempt({...base,activity:'personal-example',answer:'New context'},4);
    expect(canResolveTransfer('weak',1,[first,repeated,example])).toBe(false);
    expect(canResolveTransfer('weak',1,[first,{...repeated,recordingId:changedId},example])).toBe(true);
  });
});

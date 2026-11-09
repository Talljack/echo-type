import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeMonoWav } from './studio-audio';
import { usePronunciationStore } from '@/stores/pronunciation-store';
import { assessAcousticRecording } from './acoustic-assessment';
const wav = () => new Blob([encodeMonoWav(new Float32Array(3200).fill(0.2), 16000)], {type:'audio/wav'});
beforeEach(() => {
  const values = new Map<string,string>();
  vi.stubGlobal('localStorage', {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});
  usePronunciationStore.setState({speechSuperAppKey:'test-key',speechSuperSecretKey:'test-secret',monthlyLimit:1000});
});
afterEach(() => {vi.unstubAllGlobals();});
describe('actual acoustic assessment', () => {
  it('rejects missing keys and empty audio without calling any provider', async () => {
    const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
    usePronunciationStore.setState({speechSuperAppKey:''});
    await expect(assessAcousticRecording(wav(),'hello')).rejects.toThrow(/Settings/);
    usePronunciationStore.setState({speechSuperAppKey:'test-key'});
    await expect(assessAcousticRecording(new Blob([]),'hello')).rejects.toThrow(/audio/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('uploads actual WAV bytes and keeps provider word/phoneme metrics', async () => {
    const payload={status:'success',result:{overall:83,words:[{word:'hello',scores:{overall:72},phonemes:[{phoneme:'h',pronunciation:61}]}]}};
    const fetchMock=vi.fn().mockResolvedValue(Response.json(payload));vi.stubGlobal('fetch',fetchMock);
    const input=wav();const result=await assessAcousticRecording(input,'hello');
    expect(result.overall).toBe(83);expect(result.fluency).toBeUndefined();
    expect(result.phonemes).toEqual([{phoneme:'h',score:61}]);
    expect(result.words[0].word).toBe('hello');
    const body=fetchMock.mock.calls[0][1].body as FormData;
    expect(await (body.get('audio') as Blob).arrayBuffer()).toEqual(await input.arrayBuffer());
    expect(body.get('referenceText')).toBe('hello');
    expect(JSON.parse(localStorage.getItem('echotype_pronunciation_usage')!).count).toBe(1);
  });
  it('does not substitute AI or increment usage when acoustic metrics are absent', async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({status:'success',result:{words:[]}})));
    await expect(assessAcousticRecording(wav(),'hello')).rejects.toThrow(/metrics/);
    expect(localStorage.getItem('echotype_pronunciation_usage')).toBeNull();
  });
  it('refuses exhausted quota and cancelled requests before uploading', async () => {
    usePronunciationStore.setState({monthlyLimit:0});const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
    await expect(assessAcousticRecording(wav(),'hello')).rejects.toThrow(/limit/);
    usePronunciationStore.setState({monthlyLimit:1000});const controller=new AbortController();controller.abort();
    await expect(assessAcousticRecording(wav(),'hello',{signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

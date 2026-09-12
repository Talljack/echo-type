import JSZip from 'jszip';
import { expect, it, vi } from 'vitest';
import { createBackupArchive, readBackupArchive, shouldRestoreRow } from './backup';
it('restores revision and deletion intent only to the same signed-in account',async()=>{
 const archive=await createBackupArchive({contents:[],syncEntityState:[{id:'favorites:f',revision:2,snapshot:{id:'f',text:'old'}}]},'echotype:user:alice');
 expect((await readBackupArchive(archive,'echotype:user:alice')).syncEntityState).toHaveLength(1);
 expect((await readBackupArchive(archive,'echotype:user:bob')).syncEntityState).toBeUndefined();
 expect((await readBackupArchive(archive,'echotype:anonymous')).syncEntityState).toBeUndefined();
});
it('rejects oversized expanded metadata before JSZip loading or inflation', async () => {
  const zip = new JSZip(); zip.file('manifest.json', 'a'.repeat(100000));
  const bytes = await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  for(let i=0;i<bytes.length-46;i++) if(view.getUint32(i,true)===0x02014b50){view.setUint32(i+24,513*1024*1024,true);break;}
  const load=vi.spyOn(JSZip,'loadAsync');
  try { await expect(readBackupArchive(bytes)).rejects.toThrow(/expanded|limit/i); expect(load).not.toHaveBeenCalled(); } finally { load.mockRestore(); }
});
it('rejects traversal and excess entry count before ZIP loading', async () => {
  const zip=new JSZip();zip.file('../manifest.json','{}',{createFolders:false});
  const bytes=await zip.generateAsync({type:'uint8array'});
  const load=vi.spyOn(JSZip,'loadAsync');
  try { await expect(readBackupArchive(bytes)).rejects.toThrow(/path/i);expect(load).not.toHaveBeenCalled(); }finally{load.mockRestore();}
  const valid=await createBackupArchive({contents:[]});
  const view=new DataView(valid.buffer,valid.byteOffset,valid.byteLength);const eocd=valid.length-22;
  view.setUint16(eocd+8,10001,true);view.setUint16(eocd+10,10001,true);
  await expect(readBackupArchive(valid)).rejects.toThrow(/entry|entries/i);
});
it('rejects compressed payloads even when declared sizes are forged below the limit',async()=>{
 const zip=new JSZip();zip.file('manifest.json','a'.repeat(100000));
 const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
 const load=vi.spyOn(JSZip,'loadAsync');
 try{await expect(readBackupArchive(bytes)).rejects.toThrow(/compressed backups/);expect(load).not.toHaveBeenCalled();}finally{load.mockRestore();}
});
it('rejects corrupt local header sizes before loading ZIP',async()=>{
 const bytes=await createBackupArchive({contents:[]});
 new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).setUint32(22,1,true);
 const load=vi.spyOn(JSZip,'loadAsync');
 try{await expect(readBackupArchive(bytes)).rejects.toThrow(/inconsistent entry sizes/);expect(load).not.toHaveBeenCalled();}finally{load.mockRestore();}
});
it('round trips media bytes and import-job blobs with checksums', async () => {
  const data = { contents: [{ id: 'c', text: 'Original', updatedAt: 20 }], mediaBlobs: [{ contentId: 'c', blob: new Blob(['audio'], {type:'audio/wav'}), createdAt: 20 }], importJobs: [{ id: 'j', file: new Blob(['source']) }] };
  const bytes = await createBackupArchive(data);
  const restored = await readBackupArchive(bytes);
  expect(await (restored.mediaBlobs[0].blob as Blob).text()).toBe('audio');
  expect(await (restored.importJobs[0].file as Blob).text()).toBe('source');
});
it('rejects corrupt media before any restoration', async () => {
  const zip = await JSZip.loadAsync(await createBackupArchive({mediaBlobs:[{contentId:'c',blob:new Blob(['audio'])}]}));
  const name = Object.keys(zip.files).find(n=>n.startsWith('blobs/') && !zip.files[n].dir)!;
  zip.file(name, 'corrupt');
  await expect(readBackupArchive(await zip.generateAsync({type:'uint8array'}))).rejects.toThrow(/checksum/i);
});
it('accepts legacy full JSON and never merges over newer local work', async () => {
  const restored = await readBackupArchive(new TextEncoder().encode(JSON.stringify({_echotype_backup:true,_version:2,contents:[{id:'a',updatedAt:1}]})));
  expect(restored.contents).toHaveLength(1);
  expect(shouldRestoreRow({updatedAt:10},{updatedAt:20})).toBe(false);
});
it('does not activate conflicts from another account backup', async () => {
 const bytes=await createBackupArchive({syncConflicts:[{id:'conflict',local:{id:'b'},remote:{id:'b'},createdAt:1}]},'echotype:user:alice');
 expect((await readBackupArchive(bytes,'echotype:user:bob')).syncConflicts?.every(row=>!!row.resolvedAt)).toBe(true);
 expect((await readBackupArchive(bytes,'echotype:user:alice')).syncConflicts?.[0].resolvedAt).toBeUndefined();
});

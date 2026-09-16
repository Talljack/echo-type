import {expect,it} from 'vitest';
import JSZip from 'jszip';
import {extractDocx} from './extract-text';
it('extracts a real DOCX with the installed secure XML dependency',async()=>{
 const zip=new JSZip();
 zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 zip.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 zip.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello from a real document.</w:t></w:r></w:p></w:body></w:document>');
 await expect(extractDocx(await zip.generateAsync({type:'nodebuffer'}))).resolves.toMatchObject({text:expect.stringContaining('Hello from a real document.')});
});

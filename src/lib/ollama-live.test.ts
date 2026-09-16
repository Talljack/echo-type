import {expect,it} from 'vitest';
import {generateText,Output} from 'ai';
import {z} from 'zod';
import {resolveModel} from './ai-model';
import {NextRequest} from 'next/server';
import {POST} from '@/app/api/import/organize/route';

// Opt-in integration check against a real, locally installed model. No credentials or private data.
it.runIf(process.env.ECHOTYPE_LOCAL_AI==='1')('local Ollama returns schema-constrained learning material',async()=>{
 const model=resolveModel({providerId:'ollama',modelId:'llama3.2:latest',baseUrl:'http://127.0.0.1:11434',apiKey:'ollama'});
 const {output}=await generateText({model,output:Output.object({schema:z.object({title:z.string(),sentences:z.array(z.string())})}),maxOutputTokens:6000,prompt:'Organize this transcript into English sentences: Good morning. I would like a cup of coffee without sugar, please.'});
 expect(output.title.length).toBeGreaterThan(0);expect(output.sentences.length).toBeGreaterThan(0);
},60000);
it.runIf(process.env.ECHOTYPE_LOCAL_AI==='1').each(['sentences','scenario'])('organize endpoint produces %s using local Ollama',async(target)=>{
 const response=await POST(new NextRequest('http://localhost/api/import/organize',{method:'POST',body:JSON.stringify({provider:'ollama',providerConfigs:{ollama:{selectedModelId:'llama3.2:latest',baseUrl:'http://127.0.0.1:11434'}},target,text:'Good morning. I would like to order a cup of coffee. Could you make it without sugar, please? Thank you for your help.'})}));
 const result=await response.json();expect(response.status,JSON.stringify(result)).toBe(200);
 expect(result.sentences.length).toBeGreaterThan(0);
 if(target==='scenario'){expect(result.scenario.role.length).toBeGreaterThan(0);expect(result.scenario.goal.length).toBeGreaterThan(0);}
},60000);

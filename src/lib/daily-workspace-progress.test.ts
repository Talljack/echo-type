import { describe, expect, it } from 'vitest';
import { dailyWorkspaceProgress } from './daily-workspace-progress';
import type { ContentItem, TypingSession } from '@/types/content';

describe('daily workspace progress',()=>{
  it('counts saved completed exercises today, and distinct vocabulary without counting articles as new words',()=>{
    const now=new Date(2026,8,8,12).getTime();
    const session=(id:string,contentId:string,time:number,completed=true)=>({id,contentId,startTime:time,completed}) as TypingSession;
    const contents=[{id:'word',type:'word'},{id:'article',type:'article'}] as ContentItem[];
    expect(dailyWorkspaceProgress([
      session('a','word',now),session('b','word',now),session('c','article',now),
      session('pending','word',now,false),session('old','word',now-86400000),
    ],contents,now)).toEqual({practices:3,words:1});
  });
  it('uses the finish date for practice crossing midnight',()=>{
    const now=new Date(2026,8,8,0,1).getTime();
    expect(dailyWorkspaceProgress([{id:'a',startTime:now-120000,endTime:now,completed:true}] as TypingSession[],[],now)).toEqual({practices:1,words:0});
  });
});

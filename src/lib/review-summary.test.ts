import { describe, expect, it } from 'vitest';
import { reviewSummary } from './review-summary';
import type { ContentItem, LearningRecord } from '@/types/content';
import type { FavoriteItem } from '@/types/favorite';

describe('review summary', () => {
  it('counts independent queues, respecting each existing due policy', () => {
    const contents = [{id:'a',title:'A',text:'a',type:'word'}] as ContentItem[];
    const records = [{id:'r',contentId:'a',module:'read',nextReview:50,accuracy:80,attempts:1}] as LearningRecord[];
    const favorites = [{nextReview:50}, {nextReview:200}, {}] as FavoriteItem[];
    expect(reviewSummary(records,contents,favorites,[{resolved:false},{resolved:true}],100)).toEqual({lessons:1,notes:1,weakSpots:1});
    expect(reviewSummary(records,contents.map(c=>({...c,deletedAt:1})),favorites,[],100).lessons).toBe(0);
  });
});

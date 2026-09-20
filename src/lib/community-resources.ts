export const RESOURCE_FORMATS = ['course', 'website', 'video', 'podcast', 'article', 'tool'] as const;
export type ResourceFormat = (typeof RESOURCE_FORMATS)[number];
export const RESOURCE_SKILLS = ['listening', 'speaking', 'reading', 'writing', 'vocabulary', 'grammar'] as const;
export type ResourceSkill = (typeof RESOURCE_SKILLS)[number];
export type ResourceAccess = 'external-link' | 'open-license' | 'author-original' | 'permission-granted';

/** Fixed contribution shape. New recommendations must use this shape. */
export interface CommunityResource {
  id: string;
  format: ResourceFormat;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  url: string;
  scenarios: readonly string[];
  skills: readonly ResourceSkill[];
  levels: readonly string[];
  language: 'en-GB' | 'en-US' | 'en';
  publisher: string;
  access: ResourceAccess;
  sourceNote: string;
}

export const COMMUNITY_RESOURCES: readonly CommunityResource[] = [
  {
    id: 'british-council-learnenglish',
    format: 'website',
    title: 'British Council LearnEnglish',
    titleZh: '英国文化协会 LearnEnglish',
    description: 'Official activities for listening, reading, writing, speaking, grammar and vocabulary.',
    descriptionZh: '官方听说读写、语法和词汇练习。',
    url: 'https://learnenglish.britishcouncil.org/free-resources',
    scenarios: ['self-introduction', 'job-interview', 'travel', 'airport', 'hotel', 'restaurant'],
    skills: ['listening', 'speaking', 'reading', 'writing', 'vocabulary', 'grammar'],
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    language: 'en-GB',
    publisher: 'British Council',
    access: 'external-link',
    sourceNote: 'Official resource. Open the original site for its terms and activities.',
  },
  {
    id: 'voa-learning-english',
    format: 'podcast',
    title: 'VOA Learning English',
    titleZh: 'VOA 慢速英语',
    description: 'News, podcasts and leveled activities in accessible American English.',
    descriptionZh: '以易理解的美式英语提供新闻、播客和分级活动。',
    url: 'https://learningenglish.voanews.com/',
    scenarios: ['travel', 'airport', 'workplace'],
    skills: ['listening', 'vocabulary', 'reading'],
    levels: ['A2', 'B1', 'B2'],
    language: 'en-US',
    publisher: 'Voice of America',
    access: 'external-link',
    sourceNote: 'Official resource. Use its original page for audio and transcripts.',
  },
  {
    id: 'voa-youtube',
    format: 'video',
    title: 'VOA Learning English on YouTube',
    titleZh: 'VOA 英语学习 YouTube 频道',
    description: 'Short, captioned American-English video lessons and current-events explainers.',
    descriptionZh: '带字幕的短视频课程与时事讲解，适合听力输入。',
    url: 'https://www.youtube.com/@VOALearningEnglish',
    scenarios: ['travel', 'airport', 'restaurant'],
    skills: ['listening', 'vocabulary'],
    levels: ['A2', 'B1', 'B2'],
    language: 'en-US',
    publisher: 'Voice of America',
    access: 'external-link',
    sourceNote: 'Official YouTube channel. Watch on YouTube under its platform terms.',
  },
  {
    id: 'cambridge-dictionary',
    format: 'tool',
    title: 'Cambridge Dictionary',
    titleZh: '剑桥词典',
    description: 'Definitions, examples, pronunciation and word-family lookups.',
    descriptionZh: '查释义、例句、发音和词族。',
    url: 'https://dictionary.cambridge.org/',
    scenarios: [],
    skills: ['vocabulary', 'grammar'],
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    language: 'en',
    publisher: 'Cambridge University Press & Assessment',
    access: 'external-link',
    sourceNote: 'Official dictionary website; linked only.',
  },
  {
    id: 'bbc-self-introduction-video',
    format: 'video',
    title: 'How to introduce yourself',
    titleZh: 'BBC 自我介绍英语对话',
    description: 'A short BBC Learning English conversation for names, introductions and follow-up questions.',
    descriptionZh: 'BBC Learning English 的简短自我介绍与追问对话。',
    url: 'https://www.youtube.com/watch?v=I_tRSrPru94',
    scenarios: ['self-introduction', 'job-interview'],
    skills: ['listening', 'speaking'],
    levels: ['A1', 'A2'],
    language: 'en-GB',
    publisher: 'BBC Learning English',
    access: 'external-link',
    sourceNote: 'Original BBC Learning English video on YouTube; linked only.',
  },
  {
    id: 'bbc-learning-english-youtube',
    format: 'video',
    title: 'BBC Learning English on YouTube',
    titleZh: 'BBC 英语学习 YouTube 频道',
    description: 'Official short lessons for everyday conversations, workplace English and pronunciation.',
    descriptionZh: '官方短课程，覆盖日常对话、职场英语和发音练习。',
    url: 'https://www.youtube.com/@bbclearningenglish',
    scenarios: ['self-introduction', 'job-interview', 'travel', 'restaurant', 'workplace'],
    skills: ['listening', 'speaking', 'vocabulary', 'grammar'],
    levels: ['A1', 'A2', 'B1', 'B2'],
    language: 'en-GB',
    publisher: 'BBC Learning English',
    access: 'external-link',
    sourceNote: 'Official YouTube channel. Watch on YouTube under its platform terms.',
  },
  {
    id: 'ted-ed-public-speaking-101',
    format: 'course',
    title: 'TED-Ed: Public Speaking 101',
    titleZh: 'TED-Ed：公开演讲入门',
    description: 'An eight-lesson TED-Ed collection on clear communication, presentation preparation and delivery.',
    descriptionZh: 'TED-Ed 的八节公开表达课程，适合练习准备、表达和演讲呈现。',
    url: 'https://ed.ted.com/ted_ed_collections/public-speaking-101',
    scenarios: ['self-introduction', 'job-interview', 'workplace', 'presentation'],
    skills: ['listening', 'speaking', 'writing'],
    levels: ['B1', 'B2', 'C1'],
    language: 'en-US',
    publisher: 'TED-Ed',
    access: 'external-link',
    sourceNote: 'Official TED-Ed collection. Lessons and media remain on TED-Ed.',
  },
  {
    id: 'ted-public-speaking-playlist',
    format: 'video',
    title: 'TED Talks on Public Speaking',
    titleZh: 'TED 公开演讲播放列表',
    description: 'A TED playlist on presenting ideas, connecting with an audience and speaking with confidence.',
    descriptionZh: '关于表达观点、连接听众与自信演讲的 TED 播放列表。',
    url: 'https://www.ted.com/playlists/226/ted_talks_on_public_speaking',
    scenarios: ['job-interview', 'workplace', 'presentation', 'networking'],
    skills: ['listening', 'speaking'],
    levels: ['B2', 'C1'],
    language: 'en-US',
    publisher: 'TED',
    access: 'external-link',
    sourceNote: 'Official TED playlist. Talks are streamed from TED.',
  },
  {
    id: 'ted-echo-method',
    format: 'video',
    title: 'TEDx: How to use the Echo Method to learn to speak English',
    titleZh: 'TEDx：用 Echo Method 练习英语口语',
    description: 'A TEDx talk about using imitation and repetition to build speaking confidence.',
    descriptionZh: '介绍通过模仿与重复建立英语口语信心的 TEDx 演讲。',
    url: 'https://www.ted.com/talks/jan_2018_47dcaf8d-b6df-4a6b-9922-4712d6bebf59',
    scenarios: ['self-introduction', 'job-interview', 'workplace', 'presentation'],
    skills: ['listening', 'speaking'],
    levels: ['B1', 'B2'],
    language: 'en',
    publisher: 'TEDx',
    access: 'external-link',
    sourceNote: 'Original TEDx talk hosted by TED; linked only.',
  },
  {
    id: 'ted-powerful-public-speaking',
    format: 'video',
    title: 'TED: The trick to powerful public speaking',
    titleZh: 'TED：有力量的公开表达技巧',
    description: 'A practical TED talk about making a message clearer and more memorable for an audience.',
    descriptionZh: '关于让观点更清晰、更容易被听众记住的实用 TED 演讲。',
    url: 'https://www.ted.com/talks/lawrence_bernstein_the_trick_to_powerful_public_speaking',
    scenarios: ['job-interview', 'workplace', 'presentation', 'networking'],
    skills: ['listening', 'speaking'],
    levels: ['B2', 'C1'],
    language: 'en-US',
    publisher: 'TED',
    access: 'external-link',
    sourceNote: 'Original TED talk hosted by TED; linked only.',
  },
] as const;

export const RESOURCE_FORMAT_LABELS: Record<ResourceFormat, { en: string; zh: string }> = {
  course: { en: 'Course', zh: '课程' },
  website: { en: 'Website', zh: '网站' },
  video: { en: 'Video & playlists', zh: '视频与播放列表' },
  podcast: { en: 'Podcast', zh: '播客' },
  article: { en: 'Article', zh: '文章' },
  tool: { en: 'Reference tool', zh: '查阅工具' },
};
export const RESOURCE_SKILL_LABELS: Record<ResourceSkill, { en: string; zh: string }> = {
  listening: { en: 'Listening', zh: '听力' },
  speaking: { en: 'Speaking', zh: '口语' },
  reading: { en: 'Reading', zh: '阅读' },
  writing: { en: 'Writing', zh: '写作' },
  vocabulary: { en: 'Vocabulary', zh: '词汇' },
  grammar: { en: 'Grammar', zh: '语法' },
};

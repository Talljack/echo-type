export interface MorphologyEntry {
  word: string;
  parts: { form: string; kind: 'prefix' | 'root' | 'base' | 'suffix'; meaning: string }[];
  family: string[];
  meaning: string;
  source: string;
}
// Explicit teaching decompositions, not an exhaustive historical etymology database.
export const MORPHOLOGY: MorphologyEntry[] = [
  {
    word: 'transport',
    parts: [
      {
        form: 'trans',
        kind: 'prefix',
        meaning: 'across / 横跨',
      },
      {
        form: 'port',
        kind: 'root',
        meaning: 'carry / 搬运',
      },
    ],
    family: ['import', 'export', 'portable'],
    meaning: '运输',
    source:
      'https://ies.ed.gov/ies/2024/11/third-grade-teachers-guide-supporting-family-involvement-foundational-reading-skills',
  },
  {
    word: 'import',
    parts: [
      {
        form: 'im',
        kind: 'prefix',
        meaning: 'into / 向内',
      },
      {
        form: 'port',
        kind: 'root',
        meaning: 'carry / 搬运',
      },
    ],
    family: ['export', 'transport', 'portable'],
    meaning: '进口；导入',
    source:
      'https://ies.ed.gov/ies/2024/11/third-grade-teachers-guide-supporting-family-involvement-foundational-reading-skills',
  },
  {
    word: 'export',
    parts: [
      {
        form: 'ex',
        kind: 'prefix',
        meaning: 'out / 向外',
      },
      {
        form: 'port',
        kind: 'root',
        meaning: 'carry / 搬运',
      },
    ],
    family: ['import', 'transport', 'portable'],
    meaning: '出口；导出',
    source:
      'https://ies.ed.gov/ies/2024/11/third-grade-teachers-guide-supporting-family-involvement-foundational-reading-skills',
  },
  {
    word: 'portable',
    parts: [
      {
        form: 'port',
        kind: 'root',
        meaning: 'carry / 搬运',
      },
      {
        form: 'able',
        kind: 'suffix',
        meaning: 'can be / 可……的',
      },
    ],
    family: ['transport', 'import', 'export'],
    meaning: '便携的',
    source:
      'https://ies.ed.gov/ies/2024/11/third-grade-teachers-guide-supporting-family-involvement-foundational-reading-skills',
  },
  {
    word: 'predict',
    parts: [
      {
        form: 'pre',
        kind: 'prefix',
        meaning: 'before / 预先',
      },
      {
        form: 'dict',
        kind: 'root',
        meaning: 'say / 说',
      },
    ],
    family: ['prediction', 'predictable', 'dictionary'],
    meaning: '预测',
    source:
      'https://ies.ed.gov/ies/2024/11/third-grade-teachers-guide-supporting-family-involvement-foundational-reading-skills',
  },
  {
    word: 'prediction',
    parts: [
      {
        form: 'pre',
        kind: 'prefix',
        meaning: 'before / 预先',
      },
      {
        form: 'dict',
        kind: 'root',
        meaning: 'say / 说',
      },
      {
        form: 'ion',
        kind: 'suffix',
        meaning: 'noun forming / 构成名词',
      },
    ],
    family: ['predict', 'predictable'],
    meaning: '预测（名词）',
    source:
      'https://ies.ed.gov/ies/2024/11/third-grade-teachers-guide-supporting-family-involvement-foundational-reading-skills',
  },
  {
    word: 'predictable',
    parts: [
      {
        form: 'pre',
        kind: 'prefix',
        meaning: 'before / 预先',
      },
      {
        form: 'dict',
        kind: 'root',
        meaning: 'say / 说',
      },
      {
        form: 'able',
        kind: 'suffix',
        meaning: 'can be / 可……的',
      },
    ],
    family: ['predict', 'prediction'],
    meaning: '可预测的',
    source:
      'https://ies.ed.gov/ies/2024/11/third-grade-teachers-guide-supporting-family-involvement-foundational-reading-skills',
  },
  {
    word: 'unhappy',
    parts: [
      {
        form: 'un',
        kind: 'prefix',
        meaning: 'not / 不',
      },
      {
        form: 'happy',
        kind: 'base',
        meaning: 'happy / 快乐的',
      },
    ],
    family: ['happy', 'happiness'],
    meaning: '不快乐的',
    source: 'https://dictionary.cambridge.org/grammar/british-grammar/prefixes-and-suffixes',
  },
  {
    word: 'unfair',
    parts: [
      {
        form: 'un',
        kind: 'prefix',
        meaning: 'not / 不',
      },
      {
        form: 'fair',
        kind: 'base',
        meaning: 'fair / 公平的',
      },
    ],
    family: ['fair', 'fairness'],
    meaning: '不公平的',
    source: 'https://dictionary.cambridge.org/grammar/british-grammar/prefixes-and-suffixes',
  },
  {
    word: 'helpful',
    parts: [
      {
        form: 'help',
        kind: 'base',
        meaning: 'help / 帮助',
      },
      {
        form: 'ful',
        kind: 'suffix',
        meaning: 'having / 有……的',
      },
    ],
    family: ['help', 'helpless'],
    meaning: '有帮助的',
    source: 'https://dictionary.cambridge.org/grammar/british-grammar/suffixes%2B',
  },
  {
    word: 'helpless',
    parts: [
      {
        form: 'help',
        kind: 'base',
        meaning: 'help / 帮助',
      },
      {
        form: 'less',
        kind: 'suffix',
        meaning: 'without / 缺少',
      },
    ],
    family: ['help', 'helpful'],
    meaning: '无助的',
    source: 'https://dictionary.cambridge.org/grammar/british-grammar/suffixes%2B',
  },
  {
    word: 'hopeful',
    parts: [
      {
        form: 'hope',
        kind: 'base',
        meaning: 'hope / 希望',
      },
      {
        form: 'ful',
        kind: 'suffix',
        meaning: 'having / 有……的',
      },
    ],
    family: ['hope', 'hopeless'],
    meaning: '充满希望的',
    source: 'https://dictionary.cambridge.org/grammar/british-grammar/suffixes%2B',
  },
  {
    word: 'hopeless',
    parts: [
      {
        form: 'hope',
        kind: 'base',
        meaning: 'hope / 希望',
      },
      {
        form: 'less',
        kind: 'suffix',
        meaning: 'without / 缺少',
      },
    ],
    family: ['hope', 'hopeful'],
    meaning: '无望的',
    source: 'https://dictionary.cambridge.org/grammar/british-grammar/suffixes%2B',
  },
  {
    word: 'homeless',
    parts: [
      {
        form: 'home',
        kind: 'base',
        meaning: 'home / 家',
      },
      {
        form: 'less',
        kind: 'suffix',
        meaning: 'without / 缺少',
      },
    ],
    family: ['home'],
    meaning: '无家可归的',
    source: 'https://dictionary.cambridge.org/grammar/british-grammar/suffixes%2B',
  },
  {
    word: 'useless',
    parts: [
      {
        form: 'use',
        kind: 'base',
        meaning: 'use / 用处',
      },
      {
        form: 'less',
        kind: 'suffix',
        meaning: 'without / 缺少',
      },
    ],
    family: ['use', 'useful'],
    meaning: '无用的',
    source: 'https://dictionary.cambridge.org/grammar/british-grammar/suffixes%2B',
  },
  {
    word: 'useful',
    parts: [
      {
        form: 'use',
        kind: 'base',
        meaning: 'use / 用处',
      },
      {
        form: 'ful',
        kind: 'suffix',
        meaning: 'having / 有……的',
      },
    ],
    family: ['use', 'useless'],
    meaning: '有用的',
    source: 'https://dictionary.cambridge.org/grammar/british-grammar/suffixes%2B',
  },
];
export function findMorphology(word: string) {
  return MORPHOLOGY.find((entry) => entry.word === word.trim().toLowerCase());
}

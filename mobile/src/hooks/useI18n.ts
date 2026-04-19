import { useCallback, useMemo } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';

export type SupportedLang = 'en' | 'zh' | 'ja' | 'ko';

const translations: Record<string, Record<SupportedLang, string>> = {
  // Common
  'common.back': { en: 'Back', zh: '返回', ja: '戻る', ko: '뒤로' },
  'common.finish': { en: 'Finish', zh: '完成', ja: '完了', ko: '완료' },
  'common.cancel': { en: 'Cancel', zh: '取消', ja: 'キャンセル', ko: '취소' },
  'common.save': { en: 'Save', zh: '保存', ja: '保存', ko: '저장' },
  'common.goBack': { en: 'Go Back', zh: '返回', ja: '戻る', ko: '돌아가기' },
  'common.contentNotFound': {
    en: 'Content not found',
    zh: '未找到内容',
    ja: 'コンテンツが見つかりません',
    ko: '콘텐츠를 찾을 수 없습니다',
  },

  // Listen
  'listen.title': { en: 'Listen', zh: '听力', ja: 'リスニング', ko: '듣기' },
  'listen.replay': { en: 'Replay', zh: '重播', ja: 'リプレイ', ko: '다시 재생' },
  'listen.speed': { en: 'Speed', zh: '速度', ja: '速度', ko: '속도' },
  'listen.focus': { en: 'Focus Mode', zh: '专注模式', ja: 'フォーカスモード', ko: '집중 모드' },
  'listen.loop': { en: 'Loop', zh: '循环', ja: 'ループ', ko: '반복' },
  'listen.finishListening': { en: 'Finish Listening', zh: '完成听力', ja: 'リスニング完了', ko: '듣기 완료' },
  'listen.showTranslation': { en: 'Show Translation', zh: '显示翻译', ja: '翻訳を表示', ko: '번역 표시' },
  'listen.hideTranslation': { en: 'Hide Translation', zh: '隐藏翻译', ja: '翻訳を隠す', ko: '번역 숨기기' },

  // Read
  'read.title': { en: 'Read', zh: '阅读', ja: 'リーディング', ko: '읽기' },
  'read.startReading': { en: 'Start Reading Aloud', zh: '开始朗读', ja: '音読開始', ko: '소리 내어 읽기' },
  'read.stopReading': { en: 'Stop Reading', zh: '停止朗读', ja: '音読停止', ko: '읽기 중지' },
  'read.finishReading': { en: 'Finish Reading', zh: '完成阅读', ja: '読了', ko: '읽기 완료' },
  'read.score': { en: 'Pronunciation Score', zh: '发音得分', ja: '発音スコア', ko: '발음 점수' },
  'read.fullText': { en: 'Full text', zh: '全文', ja: '全文', ko: '전문' },
  'read.bySentence': { en: 'By sentence', zh: '逐句', ja: '文ごと', ko: '문장별' },
  'read.readAloud': { en: 'Read aloud', zh: '朗读', ja: '音読', ko: '소리내어 읽기' },
  'read.playing': { en: 'Playing…', zh: '播放中…', ja: '再生中…', ko: '재생 중…' },
  'read.previous': { en: 'Previous', zh: '上一句', ja: '前へ', ko: '이전' },
  'read.nextSentence': { en: 'Next sentence', zh: '下一句', ja: '次の文', ko: '다음 문장' },
  'read.sentenceScores': { en: 'Sentence scores', zh: '逐句得分', ja: '文ごとのスコア', ko: '문장별 점수' },
  'read.sentencePronunciation': { en: 'Sentence pronunciation', zh: '本句发音', ja: '文の発音', ko: '문장 발음' },
  'read.sentenceProgress': {
    en: 'Sentence {n} of {total}',
    zh: '第 {n} 句，共 {total} 句',
    ja: '{total} 文中 {n} 文目',
    ko: '{total}개 중 {n}번째 문장',
  },

  // Write
  'write.title': { en: 'Write', zh: '写作', ja: 'ライティング', ko: '쓰기' },
  'write.startTyping': { en: 'Start Typing', zh: '开始打字', ja: '入力開始', ko: '타이핑 시작' },
  'write.wpm': { en: 'WPM', zh: '字/分', ja: 'WPM', ko: 'WPM' },
  'write.accuracy': { en: 'Accuracy', zh: '准确率', ja: '正確率', ko: '정확도' },
  'write.paused': { en: 'Paused', zh: '已暂停', ja: '一時停止', ko: '일시 정지' },
  'write.time': { en: 'Time', zh: '时间', ja: '時間', ko: '시간' },
  'write.word': { en: 'word', zh: '词', ja: '語', ko: '단어' },
  'write.words': { en: 'words', zh: '词', ja: '語', ko: '단어' },
  'write.remaining': { en: 'remaining', zh: '剩余', ja: '残り', ko: '남음' },
  'write.wordsProgress': {
    en: '{done} / {total} words',
    zh: '{done} / {total} 词',
    ja: '{done} / {total} 語',
    ko: '{done} / {total}단어',
  },

  // Speak
  'speak.title': { en: 'Speak', zh: '口语', ja: 'スピーキング', ko: '말하기' },
  'speak.freeConversation': { en: 'Free Conversation', zh: '自由对话', ja: 'フリートーク', ko: '자유 대화' },
  'speak.scenarios': { en: 'Scenarios', zh: '场景练习', ja: 'シナリオ', ko: '시나리오' },
  'speak.holdToTalk': { en: 'Hold to talk', zh: '按住说话', ja: '長押しで話す', ko: '길게 눌러 말하기' },
  'speak.minutes': { en: 'minutes', zh: '分钟', ja: '分', ko: '분' },
  'speak.sessions': { en: 'sessions', zh: '次会话', ja: 'セッション', ko: '세션' },
  'speak.avgScore': { en: 'avg score', zh: '平均分', ja: '平均スコア', ko: '평균 점수' },
  'speak.suggestedTopics': { en: 'Suggested topics', zh: '推荐话题', ja: 'おすすめトピック', ko: '추천 주제' },
  'speak.freeConversationSubtitle': {
    en: 'Type or speak — pick a topic or go open-ended',
    zh: '打字或语音——选话题或自由发挥',
    ja: '入力または音声で、トピックを選ぶか自由に話す',
    ko: '입력 또는 말하기 — 주제를 고르거나 자유롭게',
  },
  'speak.scenariosCount': {
    en: 'Scenarios ({count})',
    zh: '场景练习（{count}）',
    ja: 'シナリオ（{count}）',
    ko: '시나리오 ({count})',
  },
  'speak.recentSessions': { en: 'Recent sessions', zh: '最近练习', ja: '最近のセッション', ko: '최근 세션' },
  'speak.browseLibrary': { en: 'Browse library', zh: '浏览资料库', ja: 'ライブラリを見る', ko: '라이브러리 찾기' },
  'speak.chooseFromLibrary': {
    en: 'Choose from library',
    zh: '从资料库选择',
    ja: 'ライブラリから選ぶ',
    ko: '라이브러리에서 선택',
  },
  'speak.untitled': { en: 'Untitled', zh: '无标题', ja: '無題', ko: '제목 없음' },
  'speak.scoreLabel': { en: 'Score', zh: '分数', ja: 'スコア', ko: '점수' },
  'speak.goals': { en: 'Goals', zh: '目标', ja: '目標', ko: '목표' },
  'speak.suggestedPhrases': { en: 'Suggested phrases', zh: '推荐用语', ja: 'おすすめフレーズ', ko: '추천 표현' },
  'speak.aiThinking': { en: 'AI is thinking...', zh: 'AI 思考中…', ja: 'AIが考え中…', ko: 'AI가 생각 중…' },
  'speak.typeMessagePlaceholder': {
    en: 'Type a message…',
    zh: '输入消息…',
    ja: 'メッセージを入力…',
    ko: '메시지 입력…',
  },
  'speak.tapToSendSpeech': {
    en: 'Tap to send what you said',
    zh: '点击发送已识别的语音',
    ja: 'タップして音声を送信',
    ko: '탭하여 말한 내용 보내기',
  },
  'speak.optionalMic': {
    en: 'Optional: tap mic to speak',
    zh: '可选：点麦克风说话',
    ja: '任意：マイクで話す',
    ko: '선택: 마이크를 눌러 말하기',
  },
  'speak.freeShort': { en: 'Free', zh: '自由', ja: 'フリー', ko: '자유' },

  // Review
  'review.title': { en: 'Review', zh: '复习', ja: '復習', ko: '복습' },
  'review.dueToday': { en: 'Due Today', zh: '今日待复习', ja: '今日期限', ko: '오늘 복습' },

  // Dashboard
  'dashboard.welcome': { en: 'Welcome back,', zh: '欢迎回来，', ja: 'おかえりなさい、', ko: '환영합니다,' },
  'dashboard.streak': { en: 'DAY STREAK', zh: '连续天数', ja: '連続日数', ko: '연속 일수' },
  'dashboard.totalTime': { en: 'TOTAL TIME', zh: '总时长', ja: '合計時間', ko: '총 시간' },
  'dashboard.sessions': { en: 'SESSIONS', zh: '学习次数', ja: 'セッション数', ko: '세션 수' },
  'dashboard.learner': { en: 'Learner', zh: '学习者', ja: '学習者', ko: '학습자' },
  'dashboard.keepItUp': { en: 'Keep it up!', zh: '继续保持！', ja: 'その調子！', ko: '계속 화이팅!' },
  'dashboard.startToday': { en: 'Start today!', zh: '从今天开始！', ja: '今日から始めよう！', ko: '오늘 시작하세요!' },
};

const SUPPORTED_LANGS: SupportedLang[] = ['en', 'zh', 'ja', 'ko'];

function normalizeUiLang(code: string): SupportedLang {
  const lower = code.toLowerCase();
  const base = lower.split('-')[0] ?? 'en';
  if (base === 'zh' || lower.startsWith('zh')) return 'zh';
  if ((SUPPORTED_LANGS as readonly string[]).includes(base)) return base as SupportedLang;
  return 'en';
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}

export function useI18n() {
  const rawLang = useSettingsStore((s) => s.settings.language);
  const lang = useMemo(() => normalizeUiLang(rawLang), [rawLang]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const entry = translations[key];
      if (!entry) return fallback ?? key;
      return entry[lang] ?? entry.en ?? fallback ?? key;
    },
    [lang],
  );

  const tInterpolate = useCallback(
    (key: string, vars: Record<string, string | number>, fallback?: string): string => {
      const template = t(key, fallback);
      return interpolate(template, vars);
    },
    [t],
  );

  return { t, tInterpolate, lang };
}

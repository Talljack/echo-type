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
  'read.readMode': { en: 'Read Aloud Mode', zh: '朗读模式', ja: '音読モード', ko: '소리 내어 읽기 모드' },
  'read.referenceText': { en: 'Reference Text', zh: '参考文本', ja: '参照テキスト', ko: '참고 텍스트' },
  'read.listenAlong': { en: 'Listen Along', zh: '跟读', ja: '聞きながら読む', ko: '함께 듣기' },
  'read.stop': { en: 'Stop', zh: '停止', ja: '停止', ko: '중지' },
  'read.showTranslation': { en: 'Show Translation', zh: '显示翻译', ja: '翻訳を表示', ko: '번역 보기' },
  'read.hideTranslation': { en: 'Hide Translation', zh: '隐藏翻译', ja: '翻訳を隠す', ko: '번역 숨기기' },
  'read.translating': { en: 'Translating…', zh: '翻译中…', ja: '翻訳中…', ko: '번역 중…' },
  'read.translationFailed': { en: 'Translation failed', zh: '翻译失败', ja: '翻訳に失敗しました', ko: '번역 실패' },
  'read.retry': { en: 'Retry', zh: '重试', ja: '再試行', ko: '다시 시도' },
  'read.liveReadingFeedback': {
    en: 'Live Reading Feedback',
    zh: '实时朗读反馈',
    ja: '音読フィードバック',
    ko: '실시간 읽기 피드백',
  },
  'read.pronunciationFeedback': {
    en: 'Pronunciation Feedback',
    zh: '发音反馈',
    ja: '発音フィードバック',
    ko: '발음 피드백',
  },
  'read.rawTranscript': { en: 'Raw Transcript', zh: '原始语音文本', ja: '生の文字起こし', ko: '원문 전사' },
  'read.analyzingPronunciation': {
    en: 'Analyzing pronunciation...',
    zh: '正在分析发音...',
    ja: '発音を分析中...',
    ko: '발음 분석 중...',
  },
  'read.speechNotAvailable': {
    en: 'Speech recognition is not available on this device.',
    zh: '当前设备不支持语音识别。',
    ja: 'この端末では音声認識を利用できません。',
    ko: '이 기기에서는 음성 인식을 사용할 수 없습니다.',
  },
  'read.speechRecognitionFailed': {
    en: 'Speech recognition failed. Please try again.',
    zh: '语音识别失败，请重试。',
    ja: '音声認識に失敗しました。もう一度お試しください。',
    ko: '음성 인식에 실패했습니다. 다시 시도하세요.',
  },
  'read.failedToStartRecording': {
    en: 'Failed to start recording',
    zh: '录音启动失败',
    ja: '録音を開始できませんでした',
    ko: '녹음을 시작하지 못했습니다',
  },
  'read.noSpeechDetected': {
    en: 'No speech detected. Try reading the sentence aloud again.',
    zh: '未检测到语音，请重新朗读。',
    ja: '音声が検出されませんでした。もう一度音読してください。',
    ko: '음성이 감지되지 않았습니다. 다시 읽어 주세요.',
  },
  'read.startRecording': { en: 'Start recording', zh: '开始录音', ja: '録音開始', ko: '녹음 시작' },
  'read.stopRecording': { en: 'Stop recording', zh: '停止录音', ja: '録音停止', ko: '녹음 중지' },
  'read.reset': { en: 'Reset', zh: '重置', ja: 'リセット', ko: '재설정' },
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
  'speak.translateMessage': { en: 'Translate message', zh: '翻译消息', ja: 'メッセージを翻訳', ko: '메시지 번역' },
  'speak.translateToLangHint': {
    en: 'Translates this message to {lang}',
    zh: '将此消息翻译为 {lang}',
    ja: 'このメッセージを{lang}に翻訳',
    ko: '이 메시지를 {lang}(으)로 번역',
  },
  'speak.continueLearning': { en: 'Continue learning', zh: '继续学习', ja: '学習を続ける', ko: '계속 학습하기' },
  'speak.continueAnotherScenario': {
    en: 'Try another scenario',
    zh: '换个场景练习',
    ja: '別のシナリオを試す',
    ko: '다른 시나리오 연습',
  },
  'speak.continueAnotherScenarioDesc': {
    en: 'Pick a new role-play',
    zh: '选择新的角色扮演',
    ja: '新しいロールプレイを選ぶ',
    ko: '새 롤플레이 선택',
  },
  'speak.continueVocabulary': {
    en: 'Practice related vocabulary',
    zh: '练习相关词汇',
    ja: '関連語彙を練習',
    ko: '관련 어휘 연습',
  },
  'speak.continueVocabularyDesc': {
    en: 'Open your library',
    zh: '打开资料库',
    ja: 'ライブラリを開く',
    ko: '라이브러리 열기',
  },
  'speak.continueFreeSameTopic': {
    en: 'Free conversation, same topic',
    zh: '同话题自由对话',
    ja: '同じトピックでフリー会話',
    ko: '같은 주제 자유 대화',
  },
  'speak.continueFreeSameTopicDesc': {
    en: 'Start a fresh AI chat',
    zh: '开始新的 AI 对话',
    ja: '新しいAIチャットを始める',
    ko: '새 AI 대화 시작',
  },

  // Onboarding
  'onboarding.skip': { en: 'Skip', zh: '跳过', ja: 'スキップ', ko: '건너뛰기' },
  'onboarding.skipA11yLabel': {
    en: 'Skip onboarding',
    zh: '跳过引导',
    ja: 'オンボーディングをスキップ',
    ko: '온보딩 건너뛰기',
  },
  'onboarding.skipA11yHint': {
    en: 'Skips the introduction and goes to the main app',
    zh: '跳过介绍并进入主应用',
    ja: '紹介をスキップしてアプリへ',
    ko: '소개를 건너뛰고 앱으로 이동',
  },
  'onboarding.next': { en: 'Next', zh: '下一步', ja: '次へ', ko: '다음' },
  'onboarding.getStarted': { en: 'Get Started', zh: '开始使用', ja: '始める', ko: '시작하기' },
  'onboarding.nextA11yLabel': { en: 'Next', zh: '下一步', ja: '次へ', ko: '다음' },
  'onboarding.nextA11yHint': {
    en: 'Shows the next screen',
    zh: '显示下一屏',
    ja: '次の画面を表示',
    ko: '다음 화면 표시',
  },
  'onboarding.getStartedA11yLabel': {
    en: 'Get started',
    zh: '开始使用',
    ja: '始める',
    ko: '시작하기',
  },
  'onboarding.getStartedA11yHint': {
    en: 'Completes onboarding and opens the app',
    zh: '完成引导并打开应用',
    ja: 'オンボーディングを完了してアプリを開く',
    ko: '온보딩을 완료하고 앱 열기',
  },
  'onboarding.page1.title': {
    en: 'Welcome to Echo Type',
    zh: '欢迎使用 Echo Type',
    ja: 'Echo Type へようこそ',
    ko: 'Echo Type에 오신 것을 환영합니다',
  },
  'onboarding.page1.description': {
    en: 'Master languages through immersive reading, listening, speaking, and writing practice.',
    zh: '通过沉浸式读、听、说、写练习掌握语言。',
    ja: '没入型の読む・聞く・話す・書く練習で言語をマスターしましょう。',
    ko: '읽기·듣기·말하기·쓰기 몰입 연습으로 언어를 마스터하세요.',
  },
  'onboarding.page2.title': {
    en: 'AI-Powered Learning',
    zh: 'AI 驱动的学习',
    ja: 'AIによる学習',
    ko: 'AI 기반 학습',
  },
  'onboarding.page2.description': {
    en: 'Get personalized content, instant feedback, and smart spaced repetition to accelerate your progress.',
    zh: '获取个性化内容、即时反馈和智能间隔复习，加速进步。',
    ja: 'パーソナライズされた内容、即時フィードバック、スマートな間隔反復で上達を加速します。',
    ko: '맞춤 콘텐츠, 즉각 피드백, 스마트한 간격 반복으로 실력을 키우세요.',
  },
  'onboarding.page3.title': {
    en: 'Ready to Start?',
    zh: '准备好了吗？',
    ja: '始める準備は？',
    ko: '시작할 준비가 되셨나요?',
  },
  'onboarding.page3.description': {
    en: 'Import your first content or let AI generate practice materials tailored to your level.',
    zh: '导入你的第一份内容，或让 AI 按你的水平生成练习材料。',
    ja: '最初のコンテンツを取り込むか、レベルに合った練習をAIに生成させましょう。',
    ko: '첫 콘텐츠를 가져오거나 AI가 수준에 맞는 연습 자료를 만들게 하세요.',
  },

  // Welcome (landing)
  'welcome.brandTitle': { en: 'EchoType', zh: 'EchoType', ja: 'EchoType', ko: 'EchoType' },
  'welcome.subtitle': {
    en: 'Master Languages Through',
    zh: '通过以下方式掌握语言',
    ja: '次の4つで言語をマスター',
    ko: '다음을 통해 언어 마스터',
  },
  'welcome.subtitleHighlight': {
    en: 'Listen • Speak • Read • Write',
    zh: '听 • 说 • 读 • 写',
    ja: '聞く • 話す • 読む • 書く',
    ko: '듣기 • 말하기 • 읽기 • 쓰기',
  },
  'welcome.cta': { en: 'Get Started', zh: '开始使用', ja: '始める', ko: '시작하기' },
  'welcome.hint': {
    en: 'No account needed • Start learning now',
    zh: '无需账号 • 立即开始学习',
    ja: 'アカウント不要 • 今すぐ学習開始',
    ko: '계정 없이 • 지금 바로 학습',
  },

  // Import modal
  'import.title': { en: 'Import Content', zh: '导入内容', ja: 'コンテンツを取り込む', ko: '콘텐츠 가져오기' },
  'import.submit': { en: 'Import', zh: '导入', ja: '取り込む', ko: '가져오기' },
  'import.tab.document': { en: 'Document', zh: '文档', ja: 'ドキュメント', ko: '문서' },
  'import.tab.media': { en: 'Media', zh: '媒体', ja: 'メディア', ko: '미디어' },
  'import.tab.ai': { en: 'AI', zh: 'AI', ja: 'AI', ko: 'AI' },
  'import.tab.paste': { en: 'Paste', zh: '粘贴', ja: '貼り付け', ko: '붙여넣기' },
  'import.tab.upload': { en: 'Upload', zh: '上传', ja: 'アップロード', ko: '업로드' },
  'import.tab.url': { en: 'URL', zh: '网址', ja: 'URL', ko: 'URL' },
  'import.tab.local': { en: 'Local', zh: '本地', ja: 'ローカル', ko: '로컬' },
  'import.placeholder.title': { en: 'Title', zh: '标题', ja: 'タイトル', ko: '제목' },
  'import.placeholder.pasteText': {
    en: 'Paste or type your text here...',
    zh: '在此粘贴或输入文本…',
    ja: 'ここにテキストを貼り付けまたは入力…',
    ko: '여기에 텍스트를 붙여넣거나 입력…',
  },
  'import.hint.uploadDocument': {
    en: 'Tap Import to choose TXT, MD, PDF, DOCX, or EPUB (max 20 MB).',
    zh: '点「导入」选择 TXT、MD、PDF、DOCX 或 EPUB（最大 20 MB）。',
    ja: '「取り込み」で TXT・MD・PDF・DOCX・EPUB を選択（最大20MB）。',
    ko: '가져오기를 눌러 TXT, MD, PDF, DOCX, EPUB 선택(최대 20MB).',
  },
  'import.placeholder.articleUrl': {
    en: 'Enter article URL',
    zh: '输入文章链接',
    ja: '記事のURLを入力',
    ko: '기사 URL 입력',
  },
  'import.media.fromVideo': {
    en: 'Import from YouTube or other video platforms',
    zh: '从 YouTube 或其他视频平台导入',
    ja: 'YouTubeなどの動画から取り込み',
    ko: 'YouTube 등 동영상에서 가져오기',
  },
  'import.placeholder.videoUrl': {
    en: 'Enter YouTube or video URL',
    zh: '输入 YouTube 或视频链接',
    ja: 'YouTubeまたは動画のURL',
    ko: 'YouTube 또는 동영상 URL',
  },
  'import.hint.transcribeLocal': {
    en: 'Tap "Import" to select an audio or video file from your device for transcription',
    zh: '点「导入」选择设备上的音视频以转写',
    ja: '「取り込み」で音声・動画を選び文字起こし',
    ko: '「가져오기」로 기기의 오디오·동영상을 선택해 전사',
  },
  'import.difficulty.beginner': { en: 'Beginner', zh: '初级', ja: '初級', ko: '초급' },
  'import.difficulty.intermediate': { en: 'Intermediate', zh: '中级', ja: '中級', ko: '중급' },
  'import.difficulty.advanced': { en: 'Advanced', zh: '高级', ja: '上級', ko: '고급' },
  'import.validation.titleAndText': {
    en: 'Please enter title and text',
    zh: '请输入标题和正文',
    ja: 'タイトルと本文を入力してください',
    ko: '제목과 본문을 입력하세요',
  },
  'import.validation.url': {
    en: 'Please enter a URL',
    zh: '请输入链接',
    ja: 'URLを入力してください',
    ko: 'URL을 입력하세요',
  },
  'import.validation.videoUrl': {
    en: 'Please enter a YouTube or video URL',
    zh: '请输入 YouTube 或视频链接',
    ja: 'YouTubeまたは動画のURLを入力',
    ko: 'YouTube 또는 동영상 URL을 입력하세요',
  },
  'import.validation.prompt': {
    en: 'Please enter a prompt',
    zh: '请输入提示',
    ja: 'プロンプトを入力してください',
    ko: '프롬프트를 입력하세요',
  },
  'import.toast.successTitle': { en: 'Success', zh: '成功', ja: '成功', ko: '성공' },
  'import.toast.successMessage': {
    en: 'Content imported successfully',
    zh: '内容导入成功',
    ja: '取り込みに成功しました',
    ko: '콘텐츠를 가져왔습니다',
  },
  'import.toast.failTitle': { en: 'Import Failed', zh: '导入失败', ja: '取り込み失敗', ko: '가져오기 실패' },
  'import.error.generic': {
    en: 'Failed to import content',
    zh: '导入内容失败',
    ja: '取り込みに失敗しました',
    ko: '콘텐츠를 가져오지 못했습니다',
  },
  'import.error.fileTooLarge': {
    en: 'File must be under 20 MB.',
    zh: '文件须小于 20 MB。',
    ja: 'ファイルは20MB未満にしてください。',
    ko: '파일은 20MB 미만이어야 합니다.',
  },
  'import.error.emptyFile': {
    en: 'This file has no readable text.',
    zh: '该文件没有可读取的文本。',
    ja: '読み取れるテキストがありません。',
    ko: '읽을 수 있는 텍스트가 없습니다.',
  },
  'import.error.unsupportedFormat': {
    en: 'Unsupported file type.',
    zh: '不支持的文件类型。',
    ja: '未対応のファイル形式です。',
    ko: '지원하지 않는 파일 형식입니다.',
  },
  'import.success.title': { en: 'Done', zh: '完成', ja: '完了', ko: '완료' },
  'import.success.message': {
    en: 'Content imported successfully.',
    zh: '内容已成功导入。',
    ja: 'コンテンツを取り込みました。',
    ko: '콘텐츠를 가져왔습니다.',
  },
  'import.description.ai': {
    en: 'Generate learning content from a topic',
    zh: '根据主题生成学习内容',
    ja: 'トピックから学習コンテンツを生成',
    ko: '주제로 학습 콘텐츠 생성',
  },
  'import.placeholder.aiTopic': {
    en: 'Topic (e.g. climate change, business English)',
    zh: '主题（如气候变化、商务英语）',
    ja: 'トピック（例：気候変動、ビジネス英語）',
    ko: '주제 (예: 기후 변화, 비즈니스 영어)',
  },
  'import.label.difficulty': { en: 'Difficulty', zh: '难度', ja: '難易度', ko: '난이도' },
  'import.label.tags': { en: 'Tags', zh: '标签', ja: 'タグ', ko: '태그' },
  'import.placeholder.tags': {
    en: 'Tags, comma-separated',
    zh: '标签，逗号分隔',
    ja: 'タグ（カンマ区切り）',
    ko: '태그(쉼표로 구분)',
  },
  'import.label.language': { en: 'Language', zh: '语言', ja: '言語', ko: '언어' },
  'import.language.auto': { en: 'Auto', zh: '自动', ja: '自動', ko: '자동' },
  'import.language.en': { en: 'EN', zh: 'EN', ja: 'EN', ko: 'EN' },
  'import.language.zh': { en: '中文', zh: '中文', ja: '中文', ko: '中文' },
  'import.language.ja': { en: 'JA', zh: 'JA', ja: 'JA', ko: 'JA' },
  'import.language.ko': { en: 'KO', zh: 'KO', ja: 'KO', ko: 'KO' },
  'import.label.contentType': { en: 'Content type', zh: '内容类型', ja: 'コンテンツ種別', ko: '콘텐츠 유형' },
  'import.contentType.word': { en: 'Words', zh: '单词', ja: '単語', ko: '단어' },
  'import.contentType.phrase': { en: 'Phrases', zh: '短语', ja: 'フレーズ', ko: '구문' },
  'import.contentType.sentence': { en: 'Sentences', zh: '句子', ja: '文', ko: '문장' },
  'import.contentType.article': { en: 'Article', zh: '文章', ja: '記事', ko: '글' },
  'import.a11y.cancel': {
    en: 'Cancel import',
    zh: '取消导入',
    ja: '取り込みをキャンセル',
    ko: '가져오기 취소',
  },
  'import.a11y.cancelHint': {
    en: 'Closes without importing',
    zh: '关闭且不导入',
    ja: '取り込まずに閉じる',
    ko: '가져오지 않고 닫기',
  },
  'import.a11y.confirm': {
    en: 'Import content',
    zh: '导入内容',
    ja: 'コンテンツを取り込む',
    ko: '콘텐츠 가져오기',
  },
  'import.a11y.confirmHint': {
    en: 'Imports with the selected options',
    zh: '使用所选选项导入',
    ja: '選択した方法で取り込む',
    ko: '선택한 옵션으로 가져오기',
  },

  // Review
  'review.title': { en: 'Review', zh: '复习', ja: '復習', ko: '복습' },
  'review.dueToday': { en: 'Due Today', zh: '今日待复习', ja: '今日期限', ko: '오늘 복습' },
  'review.filterToday': { en: 'Today', zh: '今日', ja: '今日', ko: '오늘' },
  'review.filterAll': { en: 'All', zh: '全部', ja: 'すべて', ko: '전체' },
  'review.filterFavorites': { en: 'Favorites', zh: '收藏', ja: 'お気に入り', ko: '즐겨찾기' },
  'review.filterContent': { en: 'Content', zh: '内容', ja: 'コンテンツ', ko: '콘텐츠' },
  'review.dailyPlan': { en: "Today's plan", zh: '今日计划', ja: '今日のプラン', ko: '오늘 플랜' },
  'review.planProgress': {
    en: '{done} / {total} reviewed today',
    zh: '今日已复习 {done} / {total}',
    ja: '今日 {total} 件中 {done} 件完了',
    ko: '오늘 {done} / {total} 복습',
  },
  'review.forecast': { en: 'Upcoming', zh: '即将到来', ja: '今後の予定', ko: '예정' },
  'review.forecastLine': {
    en: 'Tomorrow: {tomorrow} · Next 7 days: {week}',
    zh: '明天：{tomorrow} · 未来7天：{week}',
    ja: '明日：{tomorrow} · 7日間：{week}',
    ko: '내일: {tomorrow} · 7일간: {week}',
  },
  'review.allDone': {
    en: 'All done for today!',
    zh: '今日任务全部完成！',
    ja: '今日はすべて完了！',
    ko: '오늘 복습을 모두 마쳤어요!',
  },
  'review.allDoneSubtitle': {
    en: 'Great work staying on schedule.',
    zh: '坚持计划，做得很棒。',
    ja: 'スケジュール通りに頑張りました。',
    ko: '계획대로 잘 해냈어요.',
  },
  'review.itemsReviewed': { en: 'Items reviewed', zh: '复习条数', ja: '復習件数', ko: '복습한 항목' },
  'review.timeSpent': { en: 'Time (approx.)', zh: '用时（约）', ja: '所要時間（目安）', ko: '소요 시간(약)' },
  'review.minutesShort': { en: '{n} min', zh: '{n} 分钟', ja: '{n} 分', ko: '{n}분' },
  'review.comeBackTomorrow': { en: 'Come back tomorrow', zh: '明天再来', ja: 'また明日', ko: '내일 또 만나요' },
  'review.continueExtra': { en: 'Continue with extra reviews', zh: '继续加练', ja: '追加で復習', ko: '추가 복습하기' },
  'review.sessionProgress': {
    en: 'This session: {done} done · {left} left',
    zh: '本会话：已完成 {done} · 剩余 {left}',
    ja: 'セッション：{done} 完了 · 残り {left}',
    ko: '세션: {done} 완료 · {left} 남음',
  },
  'review.nothingDueToday': {
    en: 'Nothing left on today’s plan',
    zh: '今日计划没有待复习项',
    ja: '今日のプランに残りはありません',
    ko: '오늘 플랜에 남은 항목이 없어요',
  },
  'review.nothingDueTodayHint': {
    en: 'Switch to All for more practice, or check back later.',
    zh: '可切换到「全部」继续练习，或稍后再来。',
    ja: '「すべて」に切り替えるか、後でもう一度。',
    ko: '「전체」로 바꿔 더 연습하거나 나중에 다시 오세요.',
  },

  // Cloud sync (settings)
  'sync.neverSynced': { en: 'Never synced', zh: '尚未同步', ja: '未同期', ko: '동기화 없음' },
  'sync.justNow': { en: 'Just now', zh: '刚刚', ja: 'たった今', ko: '방금' },
  'sync.minutesAgo': { en: '{n} min ago', zh: '{n} 分钟前', ja: '{n} 分前', ko: '{n}분 전' },
  'sync.hoursAgo': { en: '{n} h ago', zh: '{n} 小时前', ja: '{n} 時間前', ko: '{n}시간 전' },
  'sync.daysAgo': { en: '{n} d ago', zh: '{n} 天前', ja: '{n} 日前', ko: '{n}일 전' },
  'sync.lastSynced': { en: 'Last synced', zh: '上次同步', ja: '最終同期', ko: '마지막 동기화' },
  'sync.syncing': { en: 'Syncing…', zh: '同步中…', ja: '同期中…', ko: '동기화 중…' },
  'sync.syncNow': { en: 'Sync now', zh: '立即同步', ja: '今すぐ同期', ko: '지금 동기화' },
  'sync.autoSync': {
    en: 'Auto-sync on open',
    zh: '打开应用时自动同步',
    ja: '起動時に自動同期',
    ko: '앱 열 때 자동 동기화',
  },
  'sync.autoSyncSubtitle': {
    en: 'When signed in, syncs about every 5 minutes',
    zh: '登录后约每 5 分钟同步一次',
    ja: 'ログイン中は約5分ごと',
    ko: '로그인 시 약 5분마다',
  },
  'sync.itemsSynced': {
    en: '{n} items in last sync',
    zh: '上次同步 {n} 条',
    ja: '直近の同期 {n} 件',
    ko: '마지막 동기화 {n}개 항목',
  },
  'sync.notConfigured': {
    en: 'Add Supabase keys to enable cloud sync',
    zh: '配置 Supabase 以启用云同步',
    ja: 'Supabase を設定するとクラウド同期',
    ko: 'Supabase 키로 클라우드 동기화',
  },

  // Notifications
  'settings.dailyReminder': { en: 'Daily Reminder', zh: '每日提醒', ja: '毎日のリマインダー', ko: '일일 알림' },
  'settings.reminderTime': { en: 'Reminder Time', zh: '提醒时间', ja: 'リマインダー時刻', ko: '알림 시간' },
  'settings.reminderBody': {
    en: 'Your daily learning session awaits. Keep your streak going!',
    zh: '今天的学习还没完成，快来保持连续学习记录吧！',
    ja: '今日の学習が待っています。連続記録を維持しましょう！',
    ko: '오늘의 학습이 기다리고 있어요. 연속 학습 기록을 유지하세요!',
  },
  'settings.reminderTitle': {
    en: 'Time to practice!',
    zh: '该学习了！',
    ja: '練習の時間です！',
    ko: '연습할 시간이에요!',
  },

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

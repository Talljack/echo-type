export type ScenarioCategory = 'daily' | 'work' | 'travel' | 'social' | 'academic' | 'custom';

export interface Scenario {
  id: string;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  icon: string;
  category: ScenarioCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  goalsZh: string[];
  systemPrompt: string;
  openingMessage: string;
  source: 'builtin' | 'custom';
  createdAt: number;
  updatedAt: number;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'recording';
  content: string;
  timestamp: number;
  translationEnabled?: boolean;
  translation?: string | null;
  isTranslating?: boolean;
  translationError?: string | null;
  isPlaying?: boolean;
}

export interface ConversationSession {
  id: string;
  scenarioId: string;
  messages: ConversationMessage[];
  startTime: number;
  endTime?: number;
  completed: boolean;
}

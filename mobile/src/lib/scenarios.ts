/**
 * Built-in speak practice scenarios (mobile), aligned with web `/speak` catalog.
 */

export interface Scenario {
  id: string;
  title: string;
  titleZh: string;
  category: string;
  emoji: string;
  description: string;
  systemPrompt: string;
  suggestedPhrases: string[];
  goals: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const FREE_CONVERSATION_TOPICS = ['Technology', 'Food', 'Travel', 'Sports', 'Movies', 'Music'] as const;

export type FreeConversationTopic = (typeof FREE_CONVERSATION_TOPICS)[number];

/** Section order on the Speak home screen */
export const SCENARIO_CATEGORY_ORDER = [
  'Daily Life',
  'Travel',
  'Business',
  'Academic',
  'Shopping',
  'Medical',
  'Social',
] as const;

export const BUILTIN_SCENARIOS: Scenario[] = [
  {
    id: 'sc_coffee',
    title: 'Ordering Coffee',
    titleZh: '点咖啡',
    category: 'Daily Life',
    emoji: '☕',
    description: 'Order drinks and small talk at a neighborhood café.',
    systemPrompt: `You are a warm barista at "Sunrise Coffee". Help the customer order naturally.
Offer sizes, milk options, and specials. Confirm the total with simple prices. Keep replies short (2–3 sentences).`,
    suggestedPhrases: [
      'Could I get a medium oat milk latte, please?',
      'What are your specials today?',
      'Is there Wi‑Fi here?',
    ],
    goals: ['Greet the barista', 'Order with customizations', 'Ask price and pay'],
    difficulty: 'beginner',
  },
  {
    id: 'sc_restaurant',
    title: 'Restaurant Ordering',
    titleZh: '餐厅点餐',
    category: 'Daily Life',
    emoji: '🍽️',
    description: 'Order food, ask about the menu, and handle the bill.',
    systemPrompt: `You are a waiter at "Bella Notte" Italian restaurant. Describe specials, take drink then food orders, check back once, and handle the bill. Natural restaurant English, intermediate level.`,
    suggestedPhrases: [
      'What do you recommend tonight?',
      'Could we have the check, please?',
      "I'm allergic to nuts — is this dish safe?",
    ],
    goals: ['Ask for recommendations', 'Order food and drinks', 'Request the bill'],
    difficulty: 'intermediate',
  },
  {
    id: 'sc_directions',
    title: 'Asking for Directions',
    titleZh: '问路',
    category: 'Travel',
    emoji: '🗺️',
    description: 'Ask a local for clear directions using landmarks.',
    systemPrompt: `You are a friendly local on the street. A tourist asks for directions. Use left/right/straight, landmarks, and walking time. Simplify if they seem lost.`,
    suggestedPhrases: [
      'How do I get to the train station from here?',
      'Is it within walking distance?',
      'Could you repeat that more slowly, please?',
    ],
    goals: ['Ask how to reach a place', 'Understand directions', 'Thank and confirm'],
    difficulty: 'beginner',
  },
  {
    id: 'sc_airport',
    title: 'Airport Check-in',
    titleZh: '机场值机',
    category: 'Travel',
    emoji: '✈️',
    description: 'Check in, bags, seat preference, and gate information.',
    systemPrompt: `You are an airline agent at the counter. Ask for passport and booking reference, confirm flight, handle luggage, assign seat, give gate and boarding time. Mention delays clearly if needed.`,
    suggestedPhrases: [
      'I would like to check in, please.',
      'Could I have an aisle seat?',
      'Where is the security checkpoint?',
    ],
    goals: ['Check in for your flight', 'Ask about gate and boarding', 'Handle a schedule change'],
    difficulty: 'intermediate',
  },
  {
    id: 'sc_hotel',
    title: 'Hotel Check-in',
    titleZh: '酒店入住',
    category: 'Travel',
    emoji: '🏨',
    description: 'Front desk: reservation, amenities, and room requests.',
    systemPrompt: `You are a professional receptionist at The Grand Hotel. Verify reservation, explain Wi‑Fi, breakfast, pool/gym hours, and handle requests (extra pillow, late checkout). Polite, intermediate English.`,
    suggestedPhrases: [
      'I have a reservation under the name Lee.',
      'What time is breakfast served?',
      'Could I get a quiet room, please?',
    ],
    goals: ['Check in smoothly', 'Ask about amenities', 'Make a room request'],
    difficulty: 'intermediate',
  },
  {
    id: 'sc_interview',
    title: 'Job Interview',
    titleZh: '工作面试',
    category: 'Business',
    emoji: '💼',
    description: 'Behavioral and role-fit questions for a tech role.',
    systemPrompt: `You are an HR manager interviewing for a software developer role. Start briefly, then ask "Tell me about yourself", motivation, a behavioral STAR question, and invite their questions. Professional advanced English.`,
    suggestedPhrases: [
      'I am excited about this role because…',
      'In my last project, I led…',
      'What does success look like in the first 90 days?',
    ],
    goals: ['Introduce yourself professionally', 'Answer behavioral questions', 'Ask about the role'],
    difficulty: 'advanced',
  },
  {
    id: 'sc_meeting',
    title: 'Team Meeting Pitch',
    titleZh: '会议陈述',
    category: 'Business',
    emoji: '📊',
    description: 'Present an idea and respond to questions in a meeting.',
    systemPrompt: `You are a colleague in a product meeting. The user pitches an idea. Ask clarifying questions, raise one constructive concern, and align on next steps. Advanced business English, concise.`,
    suggestedPhrases: [
      'Here is the problem we are solving…',
      'The main risk is… and we will mitigate it by…',
      'Does everyone agree on the next milestone?',
    ],
    goals: ['Present clearly', 'Handle questions', 'Close with next steps'],
    difficulty: 'advanced',
  },
  {
    id: 'sc_library',
    title: 'Library Study Group',
    titleZh: '图书馆学习小组',
    category: 'Academic',
    emoji: '📚',
    description: 'Plan a study session and clarify assignments.',
    systemPrompt: `You are a classmate in the library. Discuss an upcoming assignment, share notes politely, suggest a study plan, and agree on a time to meet. Friendly academic English for learners.`,
    suggestedPhrases: [
      'Are you free to review chapter 5 tomorrow?',
      'Could you explain this problem one more time?',
      'Let us split the practice questions.',
    ],
    goals: ['Clarify the assignment', 'Coordinate study plans', 'Agree on next meeting'],
    difficulty: 'beginner',
  },
  {
    id: 'sc_office_hours',
    title: 'Professor Office Hours',
    titleZh: '教授答疑',
    category: 'Academic',
    emoji: '🎓',
    description: 'Ask questions about feedback and course concepts.',
    systemPrompt: `You are a supportive professor during office hours. Ask what they need help with, give clear explanations, suggest resources, and encourage them. Intermediate academic tone.`,
    suggestedPhrases: [
      'I did not fully understand the feedback on my essay.',
      'Could you recommend extra reading on this topic?',
      'Will this concept be on the exam?',
    ],
    goals: ['Explain your difficulty', 'Understand feedback', 'Get study guidance'],
    difficulty: 'intermediate',
  },
  {
    id: 'sc_grocery',
    title: 'Grocery Shopping',
    titleZh: '超市购物',
    category: 'Shopping',
    emoji: '🛒',
    description: 'Find items, compare options, and check out.',
    systemPrompt: `You are a helpful grocery store employee. Help locate aisles, suggest alternatives if out of stock, mention deals, and assist at checkout tone. Simple English.`,
    suggestedPhrases: [
      'Where can I find gluten-free bread?',
      'Is this item on sale today?',
      'Do you have reusable bags?',
    ],
    goals: ['Ask where products are', 'Ask about deals', 'Finish checkout politely'],
    difficulty: 'beginner',
  },
  {
    id: 'sc_clothing',
    title: 'Clothing Store',
    titleZh: '服装店',
    category: 'Shopping',
    emoji: '👕',
    description: 'Sizes, fitting room, returns, and recommendations.',
    systemPrompt: `You are a sales associate in a clothing store. Offer sizes, colors, fitting room, exchange policy, and honest style tips. Intermediate, natural retail English.`,
    suggestedPhrases: ['Do you have this in a medium?', 'Where is the fitting room?', 'What is your return policy?'],
    goals: ['Ask for sizes and colors', 'Use the fitting room', 'Understand returns'],
    difficulty: 'intermediate',
  },
  {
    id: 'sc_doctor',
    title: "Doctor's Visit",
    titleZh: '看医生',
    category: 'Medical',
    emoji: '🩺',
    description: 'Describe symptoms and understand simple advice.',
    systemPrompt: `You are a caring general practitioner. Ask about symptoms, duration, severity, allergies, explain likely causes in plain language, suggest rest or follow-up. Avoid heavy jargon.`,
    suggestedPhrases: [
      'It started three days ago and it hurts when I swallow.',
      'I am allergic to penicillin.',
      'Should I come back if it gets worse?',
    ],
    goals: ['Describe symptoms clearly', 'Answer follow-up questions', 'Repeat the plan back'],
    difficulty: 'intermediate',
  },
  {
    id: 'sc_friends',
    title: 'Party Small Talk',
    titleZh: '派对闲聊',
    category: 'Social',
    emoji: '🎉',
    description: 'Meet someone new and find common interests.',
    systemPrompt: `You are at a house party meeting the user for the first time. Light small talk: work, hobbies, mutual friends. Be warm and inclusive. Casual beginner-friendly English.`,
    suggestedPhrases: [
      'Hi, I do not think we have met — I am Alex.',
      'How do you know the host?',
      'We should grab coffee sometime!',
    ],
    goals: ['Introduce yourself', 'Find shared interests', 'Close the chat naturally'],
    difficulty: 'beginner',
  },
];

export function getScenarioById(id: string): Scenario | undefined {
  return BUILTIN_SCENARIOS.find((s) => s.id === id);
}

export function groupScenariosByCategory(): { category: string; data: Scenario[] }[] {
  const map = new Map<string, Scenario[]>();
  for (const s of BUILTIN_SCENARIOS) {
    const list = map.get(s.category) ?? [];
    list.push(s);
    map.set(s.category, list);
  }
  return SCENARIO_CATEGORY_ORDER.filter((c) => map.has(c)).map((category) => ({
    category,
    data: map.get(category)!,
  }));
}

const DEFAULT_GRADIENT: [string, string] = ['#6366F1', '#8B5CF6'];

const CATEGORY_GRADIENTS: Record<string, { light: [string, string]; dark: [string, string] }> = {
  'Daily Life': {
    light: ['#F97316', '#FB923C'],
    dark: ['#C2410C', '#EA580C'],
  },
  Travel: {
    light: ['#0EA5E9', '#38BDF8'],
    dark: ['#0369A1', '#0284C7'],
  },
  Business: {
    light: ['#4F46E5', '#7C3AED'],
    dark: ['#3730A3', '#5B21B6'],
  },
  Academic: {
    light: ['#059669', '#10B981'],
    dark: ['#047857', '#059669'],
  },
  Shopping: {
    light: ['#DB2777', '#EC4899'],
    dark: ['#9D174D', '#BE185D'],
  },
  Medical: {
    light: ['#0D9488', '#14B8A6'],
    dark: ['#0F766E', '#0D9488'],
  },
  Social: {
    light: ['#A855F7', '#C084FC'],
    dark: ['#6B21A8', '#7E22CE'],
  },
};

export function getCategoryCardGradient(category: string, isDark: boolean): [string, string] {
  const entry = CATEGORY_GRADIENTS[category];
  if (!entry) return DEFAULT_GRADIENT;
  return isDark ? entry.dark : entry.light;
}

const FREE_BASE = `You are a friendly English conversation partner. Help the user practice speaking English naturally.
Keep your responses conversational, short (2-3 sentences), and at an appropriate difficulty level.
If the user makes grammar or vocabulary mistakes, gently correct them while continuing the conversation.`;

/** System prompt for open-ended speak practice; optional topic steers the first greeting. */
export function buildFreeConversationSystemPrompt(topic?: string): string {
  if (!topic?.trim()) {
    return `${FREE_BASE}\nStart by greeting the user and suggesting a topic to discuss.`;
  }
  return `${FREE_BASE}\nThe learner chose the discussion topic: "${topic.trim()}". Open with a short greeting and a question related to this topic, then stay on or near it unless they change the subject.`;
}

/** Wraps a scenario role-play prompt with shared reply constraints. */
export function buildScenarioSystemPrompt(scenario: Scenario): string {
  return `${scenario.systemPrompt}

Stay in character. Keep each reply to 2-4 sentences unless the user asks for detail. Gently correct English mistakes while continuing the scene. Open with a short in-character greeting that fits the setting.`;
}

/**
 * Built-in speak practice scenarios (mobile), aligned with the web `/speak` catalog.
 */

export interface Scenario {
  id: string;
  title: string;
  titleZh: string;
  category: 'Daily' | 'Travel' | 'Work' | 'Social';
  emoji: string;
  description: string;
  descriptionZh: string;
  systemPrompt: string;
  suggestedPhrases: string[];
  goals: string[];
  goalsZh: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  openingMessage: string;
}

export const FREE_CONVERSATION_TOPICS = [
  'Daily Life',
  'Travel',
  'Food',
  'Hobbies',
  'Movies & Music',
  'Work & Career',
  'Technology',
  'Culture',
] as const;

export type FreeConversationTopic = (typeof FREE_CONVERSATION_TOPICS)[number];

export const FREE_CONVERSATION_TOPIC_HINTS: Record<FreeConversationTopic, string> = {
  'Daily Life': "Let's talk about daily routines and everyday life.",
  Travel: "Let's talk about travel experiences and dream destinations.",
  Food: "Let's talk about food, cooking, and restaurants.",
  Hobbies: "Let's talk about hobbies and things you enjoy doing.",
  'Movies & Music': "Let's talk about movies, TV shows, and music.",
  'Work & Career': "Let's talk about work, career goals, and professional life.",
  Technology: "Let's talk about technology and the latest trends.",
  Culture: "Let's talk about different cultures and traditions.",
};

export const FREE_CONVERSATION_OPENING_MESSAGE =
  "Hi there! I'm your English conversation partner. Feel free to talk about anything you'd like — or pick a topic above to get started. What's on your mind?";

export const BUILTIN_SCENARIOS: Scenario[] = [
  {
    id: 'sc_coffee',
    title: 'Ordering Coffee',
    titleZh: '点咖啡',
    description: 'Practice ordering your favorite drink at a cozy coffee shop.',
    descriptionZh: '在咖啡店练习点单',
    emoji: '☕',
    category: 'Daily',
    difficulty: 'beginner',
    goals: ['Greet the barista', 'Order a drink with customizations', 'Ask about the price and pay'],
    goalsZh: ['和咖啡师打招呼', '点一杯定制饮品', '询问价格并付款'],
    systemPrompt: `You are a friendly barista at a cozy coffee shop called "Sunrise Coffee". Greet the customer warmly and help them order.
- Offer the menu when asked (espresso, latte, cappuccino, americano, mocha, tea)
- Suggest popular items if they seem unsure
- Ask about size (small/medium/large) and customizations (milk type, sugar, temperature)
- Confirm the order and tell them the total (make up reasonable prices)
- Keep it natural and friendly, like a real coffee shop interaction
- Use simple English appropriate for beginners`,
    suggestedPhrases: [
      'Could I get a medium oat milk latte, please?',
      'What are your specials today?',
      'Can I make that iced?',
    ],
    openingMessage: 'Hey there! Welcome to Sunrise Coffee. What can I get started for you today?',
  },
  {
    id: 'sc_grocery',
    title: 'Grocery Shopping',
    titleZh: '超市购物',
    description: 'Navigate a grocery store, find items, and check out.',
    descriptionZh: '在超市找商品、结账',
    emoji: '🛒',
    category: 'Daily',
    difficulty: 'beginner',
    goals: ['Ask where to find an item', 'Ask about prices or deals', 'Complete the checkout'],
    goalsZh: ['询问商品位置', '询问价格或优惠', '完成结账'],
    systemPrompt: `You are a helpful grocery store employee. You're stocking shelves when a customer approaches you.
- Help them find items (fruits, vegetables, dairy, bread, snacks, drinks)
- Tell them about any deals or specials today
- If they ask about something you don't have, suggest alternatives
- At checkout, tell them the total and ask about bags
- Be friendly and patient, use simple English`,
    suggestedPhrases: [
      'Where can I find gluten-free bread?',
      'Is this item on sale today?',
      'Do you have reusable bags?',
    ],
    openingMessage: 'Hi! Can I help you find something today?',
  },
  {
    id: 'sc_directions',
    title: 'Asking for Directions',
    titleZh: '问路',
    description: 'Ask a local for directions to find your way around.',
    descriptionZh: '向路人问路',
    emoji: '🗺️',
    category: 'Travel',
    difficulty: 'beginner',
    goals: [
      'Ask how to get to a specific place',
      'Understand the directions given',
      'Thank them and confirm the route',
    ],
    goalsZh: ['询问如何到达某个地方', '理解对方给的方向', '感谢并确认路线'],
    systemPrompt: `You are a friendly local walking down the street. A tourist stops you to ask for directions.
- Give clear, simple directions using landmarks (turn left at the bank, go straight past the park)
- Use basic direction words: left, right, straight, next to, across from, behind
- If they seem confused, offer to walk them part of the way or simplify
- Mention approximate walking time
- Be warm and helpful`,
    suggestedPhrases: [
      'How do I get to the train station from here?',
      'Is it within walking distance?',
      'Could you repeat that more slowly, please?',
    ],
    openingMessage: 'Oh, hi! Are you looking for something? I know this area pretty well.',
  },
  {
    id: 'sc_hotel',
    title: 'Hotel Check-in',
    titleZh: '酒店入住',
    description: 'Check into a hotel, ask about amenities and services.',
    descriptionZh: '办理酒店入住，了解设施服务',
    emoji: '🏨',
    category: 'Travel',
    difficulty: 'intermediate',
    goals: ['Check in with your reservation', 'Ask about hotel amenities', 'Request something for your room'],
    goalsZh: ['凭预订办理入住', '询问酒店设施', '为房间提出需求'],
    systemPrompt: `You are a professional and friendly hotel receptionist at "The Grand Hotel".
- Greet the guest and ask for their reservation name or confirmation number
- Confirm their booking details (room type, nights, check-out date)
- Explain hotel amenities (pool, gym, restaurant, Wi-Fi password, breakfast hours)
- Handle special requests (extra pillows, room change, late checkout)
- Provide the room key and directions to the room
- Use polite, professional English at an intermediate level`,
    suggestedPhrases: [
      'I have a reservation under the name Lee.',
      'What time is breakfast served?',
      'Could I get a quiet room, please?',
    ],
    openingMessage: 'Good evening! Welcome to The Grand Hotel. Do you have a reservation with us?',
  },
  {
    id: 'sc_restaurant',
    title: 'Restaurant Ordering',
    titleZh: '餐厅点餐',
    description: 'Order a meal at a restaurant, ask about the menu, and handle the bill.',
    descriptionZh: '在餐厅点餐、询问菜单、结账',
    emoji: '🍽️',
    category: 'Daily',
    difficulty: 'intermediate',
    goals: ['Ask about menu recommendations', 'Order food and drinks', 'Ask for the bill and pay'],
    goalsZh: ['询问菜单推荐', '点餐和饮品', '要账单并付款'],
    systemPrompt: `You are an experienced waiter at an Italian restaurant called "Bella Notte".
- Welcome the guests and offer menus
- Describe daily specials with enthusiasm
- Help with menu choices, explain dishes if asked (ingredients, portion size, spice level)
- Take drink orders first, then food
- Check back during the meal
- Handle the bill, mention tip is not included
- Use natural restaurant English at intermediate level`,
    suggestedPhrases: [
      'What do you recommend tonight?',
      'Could we have the check, please?',
      "I'm allergic to nuts — is this dish safe?",
    ],
    openingMessage:
      "Good evening! Welcome to Bella Notte. I'll be your server tonight. Can I start you off with something to drink?",
  },
  {
    id: 'sc_interview',
    title: 'Job Interview',
    titleZh: '工作面试',
    description: 'Practice a professional job interview with an HR manager.',
    descriptionZh: '和HR经理进行模拟面试',
    emoji: '💼',
    category: 'Work',
    difficulty: 'advanced',
    goals: [
      'Introduce yourself professionally',
      'Answer behavioral questions',
      'Ask thoughtful questions about the role',
    ],
    goalsZh: ['专业地自我介绍', '回答行为面试问题', '提出关于职位的深思熟虑的问题'],
    systemPrompt: `You are an HR manager conducting a job interview for a software developer position at a tech company.
- Start with small talk to put the candidate at ease
- Ask common interview questions: "Tell me about yourself", "Why are you interested in this role?", "Describe a challenging project"
- Ask one behavioral question: "Tell me about a time when..."
- Listen actively and ask follow-up questions
- Give the candidate a chance to ask questions about the company
- Be professional but approachable
- Use business English at an advanced level`,
    suggestedPhrases: [
      'I am excited about this role because...',
      'In my last project, I led...',
      'What does success look like in the first 90 days?',
    ],
    openingMessage: 'Hi, thanks for coming in today! Please, have a seat. How was your commute?',
  },
  {
    id: 'sc_doctor',
    title: "Doctor's Appointment",
    titleZh: '看医生',
    description: 'Describe your symptoms and understand medical advice.',
    descriptionZh: '描述症状，理解医嘱',
    emoji: '🩺',
    category: 'Daily',
    difficulty: 'intermediate',
    goals: ['Describe your symptoms clearly', "Answer the doctor's questions", 'Understand the treatment plan'],
    goalsZh: ['清楚描述症状', '回答医生的问题', '理解治疗方案'],
    systemPrompt: `You are a friendly and patient doctor at a general clinic.
- Ask the patient what brings them in today
- Ask follow-up questions about symptoms (when did it start, how severe, any other symptoms)
- Explain your assessment in simple terms
- Recommend treatment (rest, medication, follow-up visit)
- Ask if they have any questions
- Be reassuring and use clear medical English at intermediate level
- Avoid overly technical jargon`,
    suggestedPhrases: [
      'It started three days ago and it hurts when I swallow.',
      'I am allergic to penicillin.',
      'Should I come back if it gets worse?',
    ],
    openingMessage: "Hello! I'm Dr. Smith. Please come in and have a seat. What brings you in today?",
  },
  {
    id: 'sc_friends',
    title: 'Making Friends',
    titleZh: '交朋友',
    description: 'Meet someone new at a party and have a casual conversation.',
    descriptionZh: '在派对上认识新朋友',
    emoji: '🎉',
    category: 'Social',
    difficulty: 'beginner',
    goals: ['Introduce yourself', 'Find common interests', 'Suggest meeting again'],
    goalsZh: ['自我介绍', '找到共同兴趣', '提议再次见面'],
    systemPrompt: `You are a friendly person at a house party. Someone you haven't met before comes up to talk to you.
- Introduce yourself naturally
- Ask about their name, what they do, hobbies
- Share your own interests and find common ground
- Be enthusiastic about shared interests
- Suggest exchanging contacts or meeting up for a shared activity
- Keep the conversation light and fun
- Use casual, friendly English appropriate for beginners`,
    suggestedPhrases: [
      "Hi, I don't think we've met — I'm Alex.",
      'How do you know the host?',
      'We should grab coffee sometime!',
    ],
    openingMessage: "Hey! I don't think we've met. I'm Alex! Are you a friend of the host?",
  },
  {
    id: 'sc_presenting',
    title: 'Presenting Ideas',
    titleZh: '展示想法',
    description: 'Present your ideas in a team meeting and handle questions.',
    descriptionZh: '在团队会议中展示想法并回答问题',
    emoji: '📊',
    category: 'Work',
    difficulty: 'advanced',
    goals: ['Present your idea clearly', 'Handle questions and pushback', 'Reach a conclusion or next steps'],
    goalsZh: ['清晰地展示你的想法', '处理问题和反对意见', '达成结论或下一步计划'],
    systemPrompt: `You are a colleague in a team meeting. The other person is about to present an idea for a new project or feature.
- Listen to their pitch and ask clarifying questions
- Raise reasonable concerns or suggest improvements
- Be supportive but also challenge weak points
- Help them refine the idea through discussion
- Agree on next steps at the end
- Use professional but conversational business English at an advanced level`,
    suggestedPhrases: [
      'Here is the problem we are solving...',
      'The main risk is... and we will mitigate it by...',
      'Does everyone agree on the next milestone?',
    ],
    openingMessage:
      "Alright, the floor is yours! I heard you've been working on something interesting. What's the idea?",
  },
  {
    id: 'sc_airport',
    title: 'Airport & Flights',
    titleZh: '机场与航班',
    description: 'Navigate the airport — check in, go through security, and board.',
    descriptionZh: '在机场办理值机、过安检、登机',
    emoji: '✈️',
    category: 'Travel',
    difficulty: 'intermediate',
    goals: ['Check in for your flight', 'Ask about gate and boarding time', 'Handle a flight issue (delay/change)'],
    goalsZh: ['办理航班值机', '询问登机口和登机时间', '处理航班问题（延误/变更）'],
    systemPrompt: `You are an airline check-in agent at the airport counter.
- Greet the passenger and ask for their passport and booking reference
- Confirm flight details (destination, departure time)
- Ask about luggage (checked bags, carry-on)
- Assign a seat (window/aisle preference)
- Provide boarding pass and gate information
- If there's a delay or gate change, inform them clearly
- Use clear, professional English at intermediate level`,
    suggestedPhrases: [
      'I would like to check in, please.',
      'Could I have an aisle seat?',
      'Where is the security checkpoint?',
    ],
    openingMessage:
      'Good morning! Welcome to SkyLine Airlines. May I see your passport and booking confirmation, please?',
  },
];

export function getScenarioById(id: string): Scenario | undefined {
  return BUILTIN_SCENARIOS.find((scenario) => scenario.id === id);
}

export function getFreeConversationTopicHint(topic?: string): string | undefined {
  if (!topic) return undefined;
  return FREE_CONVERSATION_TOPIC_HINTS[topic as FreeConversationTopic];
}

export function groupScenariosByCategory(): { category: string; data: Scenario[] }[] {
  const categoryOrder: Scenario['category'][] = ['Daily', 'Travel', 'Work', 'Social'];
  const grouped = new Map<Scenario['category'], Scenario[]>();

  for (const scenario of BUILTIN_SCENARIOS) {
    const list = grouped.get(scenario.category) ?? [];
    list.push(scenario);
    grouped.set(scenario.category, list);
  }

  return categoryOrder
    .filter((category) => grouped.has(category))
    .map((category) => ({ category, data: grouped.get(category)! }));
}

const DEFAULT_GRADIENT: [string, string] = ['#6366F1', '#8B5CF6'];

const CATEGORY_GRADIENTS: Record<Scenario['category'], { light: [string, string]; dark: [string, string] }> = {
  Daily: {
    light: ['#F97316', '#FB923C'],
    dark: ['#C2410C', '#EA580C'],
  },
  Travel: {
    light: ['#0EA5E9', '#38BDF8'],
    dark: ['#0369A1', '#0284C7'],
  },
  Work: {
    light: ['#4F46E5', '#7C3AED'],
    dark: ['#3730A3', '#5B21B6'],
  },
  Social: {
    light: ['#A855F7', '#C084FC'],
    dark: ['#6B21A8', '#7E22CE'],
  },
};

export function getCategoryCardGradient(category: string, isDark: boolean): [string, string] {
  const entry = CATEGORY_GRADIENTS[category as Scenario['category']];
  if (!entry) return DEFAULT_GRADIENT;
  return isDark ? entry.dark : entry.light;
}

const FREE_BASE = `You are a friendly English conversation partner. Help the user practice speaking English naturally.
Keep your responses conversational, short (2-3 sentences), and at an appropriate difficulty level.
If the user makes grammar or vocabulary mistakes, gently correct them while continuing the conversation.`;

export function buildFreeConversationSystemPrompt(topicHint?: string): string {
  if (!topicHint?.trim()) {
    return FREE_BASE;
  }

  return `${FREE_BASE}

The learner wants to focus on this topic:
"${topicHint.trim()}"

Stay near this topic unless they change the subject.`;
}

export function buildScenarioSystemPrompt(scenario: Scenario): string {
  return `${scenario.systemPrompt}

Stay in character. Keep each reply to 2-4 sentences unless the user asks for detail. Gently correct English mistakes while continuing the scene.`;
}

import fs from 'node:fs';
import url from 'node:url';

const here = url.fileURLToPath(new URL('.', import.meta.url));

const out = [];

function add(meta, block) {
  const items = block
    .trim()
    .split(/\n+/g)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) {
        return null;
      }
      const tab = trimmed.indexOf('\t');
      if (tab === -1) {
        throw new Error(`Missing tab delimiter: "${trimmed}"`);
      }
      const text = trimmed.slice(0, tab).trimEnd();
      const type = trimmed.slice(tab + 1).trim();
      if (type !== 'phrase' && type !== 'sentence') {
        throw new Error(`Bad type "${type}" in "${trimmed}"`);
      }
      return { text, type };
    })
    .filter(Boolean);
  out.push({ ...meta, items });
}

/* ───────── Travel ───────── */
add(
  {
    id: 'airport-checkin',
    title: 'Airport Check-in',
    titleZh: '机场值机',
    description: 'Kiosk and counter phrases for baggage, IDs, boarding passes, and gate updates.',
    descriptionZh: '自助与柜台托运、证件、登机牌与登机口变更用语。',
    scenario: 'Checking in before a flight.',
    category: 'travel',
    difficulty: 'intermediate',
    icon: '🎫',
    tags: ['airport', 'check-in', 'baggage', 'boarding gate', 'travel'],
  },
  `
Passport and itinerary, please.	sentence
One checked bag and a carry-on.	sentence
Window seat if possible.	sentence
Is this flight delayed?	sentence
Where do I drop my checked luggage?	sentence
My boarding pass will not print.	sentence
Could I upgrade to extra legroom?	sentence
Which gate should I go to?	sentence
Does this ticket include lounge access?	sentence
Thank you—have a good day.	sentence
`,
);

add(
  {
    id: 'customs-immigration',
    title: 'Going Through Customs',
    titleZh: '过海关与入境',
    description: 'Answer officers clearly about your trip, baggage, and declared items.',
    descriptionZh: '清楚说明入境目的、行程、行李及申报物品的表达。',
    scenario: 'Clearing immigration and customs after landing.',
    category: 'travel',
    difficulty: 'advanced',
    icon: '🛂',
    tags: ['customs', 'immigration', 'visa', 'declaration', 'border'],
  },
  `
Tourism—for two weeks.	sentence
I am staying at the Grand Pearl Hotel downtown.	sentence
I plan to leave on March 25.	sentence
I have nothing to declare.	sentence
These are personal gifts—under two hundred dollars each.	sentence
Do I need to open this bag?	sentence
I am traveling with prescription medication and a doctor’s note.	sentence
Here is my return ticket.	sentence
Thank you, officer.	sentence
Sorry—could you repeat that more slowly?	sentence
`,
);

add(
  {
    id: 'hotel-checkin',
    title: 'Hotel Check-in & Checkout',
    titleZh: '酒店入住与退房',
    description: 'Front-desk phrases for rooms, deposits, wifi, invoices, and late checkout.',
    descriptionZh: '房型押金、无线网络、报销发票及延迟退房等实用表达。',
    scenario: 'Checking into and out of a hotel.',
    category: 'travel',
    difficulty: 'intermediate',
    icon: '🏨',
    tags: ['hotel', 'front desk', 'deposit', 'wifi', 'checkout'],
  },
  `
I have a reservation under Zhang—confirmation number 7391.	sentence
Non-smoking quiet room on a higher floor, please.	sentence
Is breakfast included—and what time does it start?	sentence
What is your Wi‑Fi password?	sentence
Do you require a deposit on my card?	sentence
What time is checkout tomorrow?	sentence
Is late checkout possible for a fee?	sentence
Could I get an itemized receipt for reimbursement?	sentence
Could you call a taxi to the airport at 6 a.m.?	sentence
The room is perfect—thank you so much!	sentence
`,
);

add(
  {
    id: 'hotel-requests',
    title: 'Hotel Room Requests',
    titleZh: '客房服务与问题处理',
    description: 'Housekeeping extras, noise, HVAC issues, amenities, safe and room moves.',
    descriptionZh: '客房清洁、吵闹、空调故障、补足用品及换房的礼貌用语。',
    scenario: 'Making requests during a hotel stay.',
    category: 'travel',
    difficulty: 'intermediate',
    icon: '🛎️',
    tags: ['hotel', 'housekeeping', 'maintenance', 'concierge'],
  },
  `
Could we get two extra bath towels?	sentence
The room hasn’t been cleaned yet—could you send housekeeping?	sentence
The adjoining room is very loud—could you help us?	sentence
The heater will not warm the room—is maintenance available?	sentence
There is a small leak under the bathroom sink.	sentence
Could someone help open the safe? It will not unlock.	sentence
Could I get a toothbrush and toothpaste?	sentence
Could we switch to a quieter room if one is available?	sentence
Please schedule a wake-up call for 7:30 a.m.	sentence
If housekeeping enters, please knock first.	sentence
Could you hold our luggage after checkout?	sentence
We will need a crib tonight—do you provide one?	sentence
`,
);

add(
  {
    id: 'currency-exchange',
    title: 'Currency Exchange',
    titleZh: '货币兑换',
    description: 'Ask about rates, fees, denominations, receipts, and safer ATM options.',
    descriptionZh: '询问汇率手续费、票面大小、收据以及附近更稳妥的取款方式。',
    scenario: 'Exchanging currency while traveling.',
    category: 'travel',
    difficulty: 'intermediate',
    icon: '💱',
    tags: ['forex', 'exchange rate', 'fees', 'ATM abroad'],
  },
  `
What rate are you offering for yuan to dollars today?	sentence
Is there a service fee?	sentence
Could I get smaller bills, please?	sentence
I need this receipt for reimbursement—please print one.	sentence
Is my passport okay for verification?	sentence
Is this rate locked for today only?	sentence
Do nearby ATMs have lower fees?	sentence
Could you double-check the amount before you finalize?	sentence
Thank you—here is exactly three hundred yuan.	sentence
Have a nice day!	phrase
`,
);

add(
  {
    id: 'tourist-info',
    title: 'Asking Tourist Information',
    titleZh: '游客咨询',
    description: 'Practical questions about tickets, closures, etiquette, budgets, and transport.',
    descriptionZh: '票务闭馆信息、礼节建议、预算与交通方式的咨询用语。',
    scenario: 'Visiting an information desk or ranger station.',
    category: 'travel',
    difficulty: 'beginner',
    icon: '🗺️',
    tags: ['sightseeing', 'tourist desk', 'museum tickets etiquette'],
  },
  `
What would you recommend for a family with kids?	sentence
Are museums closed on Mondays here?	sentence
Is there a city pass for trains and museums?	sentence
Is this neighborhood safe after dark?	sentence
How much time do most people spend here?	sentence
Where can I buy tickets without a long queue?	sentence
Is tipping expected at cafés?	sentence
Is there an English audio guide available?	sentence
Thank you—that map is super helpful!	sentence
`,
);

add(
  {
    id: 'car-rental',
    title: 'Renting a Car',
    titleZh: '租车',
    description: 'Insurance choices, mileage, fuel rules, inspecting damage, and roadside help.',
    descriptionZh: '保险档位、里程、加油政策、取车划痕检查与道路救援。',
    scenario: 'Picking up and returning a rental car.',
    category: 'travel',
    difficulty: 'intermediate',
    icon: '🚗',
    tags: ['rental car insurance GPS tolls roadside'],
  },
  `
I booked a midsize sedan under the name Li—confirmation 58QR.	sentence
What insurance options do you recommend?	sentence
Is mileage unlimited on this reservation?	sentence
Please note a scratch on the front bumper—it was already here.	sentence
Do I return it with a full tank?	sentence
Does this car have Apple CarPlay and USB‑C chargers?	sentence
How do tolls work with this rental?	sentence
What number do I call for roadside assistance?	sentence
I’d like to add a second authorized driver—is there a fee?	sentence
Where is the after-hours drop box for keys?	sentence
I need snow chains—are they mandatory on mountain roads?	sentence
Thanks—we will return it clean and topped up.	sentence
`,
);

add(
  {
    id: 'flight-delay',
    title: 'Dealing with Flight Delays',
    titleZh: '航班延误与改签',
    description: 'Rebook calmly, ask about meals and vouchers, and document next steps.',
    descriptionZh: '冷静改签与询问餐饮住宿券并记录凭证与行李事宜。',
    scenario: 'When your flight is delayed or canceled.',
    category: 'travel',
    difficulty: 'advanced',
    icon: '⏳',
    tags: ['delay cancellation voucher rebooking EU261 baggage'],
  },
  `
When is the next available flight to Chicago?	sentence
Do you provide meals or hotel vouchers for this delay?	sentence
My connection is tight—could you reroute me automatically?	sentence
Can you protect me on tomorrow’s earliest flight?	sentence
My checked bag—is it being rerouted behind me?	sentence
Could you confirm this in writing and email it?	sentence
I need to speak with a supervisor about compensation.	sentence
I appreciate your patience while you look this up—I know it is busy.	sentence
Could you print my updated boarding passes?	sentence
Where is customer service located in this terminal?	sentence
I will wait here—please call me when the desk is ready.	sentence
Thanks for updating me—we will head to the lounge.	sentence
`,
);

/* ───────── Work ───────── */
add(
  {
    id: 'job-interview',
    title: 'Job Interview',
    titleZh: '求职面试',
    description: 'STAR-style answers plus smart questions—sound prepared, not memorized.',
    descriptionZh: 'STAR结构与得体追问面试官的问题。',
    scenario: 'Interviewing for a professional role.',
    category: 'work',
    difficulty: 'advanced',
    icon: '📄',
    tags: ['interview STAR salary visa remote onboarding'],
  },
  `
Could you outline the typical interview process?	sentence
I led a cross-functional launch that shipped two weeks early.	sentence
We measured success with retention and onboarding completion.	sentence
What does success look like in the first ninety days?	sentence
How does this role collaborate with product and legal?	sentence
What are the biggest challenges on the roadmap right now?	sentence
Could you clarify the expectations for on-call work?	sentence
I am genuinely excited—the mission aligns with how I want to grow.	sentence
What is your timeline for next steps?	sentence
Here is how I approached a disagreement with a stakeholder.	sentence
Compensation-wise, what range are you targeting for this level?	sentence
Thank you—I really enjoyed this conversation.	sentence
I will send a short follow-up note this evening.	sentence
`,
);

add(
  {
    id: 'meeting-english',
    title: 'Business Meetings',
    titleZh: '商务会议',
    description: 'Run meetings clearly: align on goals, track decisions, and assign owners.',
    descriptionZh: '开场对齐目标、记录决策、分配负责人与收敛讨论。',
    scenario: 'Participating in workplace meetings.',
    category: 'work',
    difficulty: 'advanced',
    icon: '🤝',
    tags: ['meeting agenda action items decisions async'],
  },
  `
Let’s start with the goal for the next thirty minutes.	sentence
Does everyone agree on the problem statement?	sentence
Let’s park that topic and revisit offline.	sentence
Could you unpack what you mean by “latency risk”?	sentence
I suggest we timebox this discussion to five minutes.	sentence
Who owns the follow-up—and what is the deadline?	sentence
Let me recap the decisions before we wrap.	sentence
I will send notes and action items right after this call.	sentence
Can we align async on the doc comments by Friday?	sentence
If we do not decide today, what is the fallback plan?	sentence
Thanks everyone—this was productive.	sentence
`,
);

add(
  {
    id: 'phone-call',
    title: 'Professional Phone Calls',
    titleZh: '职场电话',
    description: 'Clear identity on the line plus callbacks, transfers, voicemail, confirmations.',
    descriptionZh: '自报家门与留言回拨、转分机以及复述确认的用语。',
    scenario: 'Making work-related phone calls.',
    category: 'work',
    difficulty: 'intermediate',
    icon: '☎️',
    tags: ['phone voicemail extension callback professional tone'],
  },
  `
Hi—this is Chen from Northline Analytics.	sentence
Is now still a good time for a quick call?	sentence
Could you transfer me to accounts payable?	sentence
What is the best number to reach you this afternoon?	sentence
Could you spell your last name for me, please?	sentence
I left a voicemail yesterday—could you help me escalate it?	sentence
If I miss you, I will text you a short summary.	sentence
Let me confirm—the case number is 44821, correct?	sentence
Thanks so much for your help—I really appreciate it.	sentence
Have a great day!	phrase
`,
);

add(
  {
    id: 'email-writing',
    title: 'Email Phrases',
    titleZh: '商务邮件常用句',
    description: 'Polite-but-direct wording for updates, deadlines, introductions, reminders.',
    descriptionZh: '进展同步、截止日期、抄送引荐与委婉催促的邮件用语。',
    scenario: 'Writing professional emails.',
    category: 'work',
    difficulty: 'advanced',
    icon: '📧',
    tags: ['email tone schedule Cc Bcc attachments follow-up'],
  },
  `
Following up on my note from Tuesday—any updates?	sentence
Per our discussion yesterday, here is the revised draft.	sentence
Could you please review this by end of day Thursday?	sentence
Looping in Maya for visibility—Maya, quick context below.	sentence
Could you share three time slots that work for you next week?	sentence
Attached for your review—comments welcome in the doc.	sentence
Gentle reminder—this item is blocking the release train.	sentence
Let me know if you need any extra context from my side.	sentence
Thanks in advance for prioritizing this.	sentence
Best regards,	phrase
Please treat this as confidential.	sentence
If anything is unclear, happy to jump on a quick call.	sentence
`,
);

add(
  {
    id: 'presentation',
    title: 'Giving a Presentation',
    titleZh: '演讲与演示',
    description: 'Signpost slides, clarify takeaways, handle Q&A, and recover from slips.',
    descriptionZh: '结构化引导幻灯片、处理问题、临场纠错并强势收尾的表达。',
    scenario: 'Presenting to colleagues or stakeholders.',
    category: 'work',
    difficulty: 'advanced',
    icon: '📊',
    tags: ['slides pacing Q&A transition executive summary demo'],
  },
  `
Today I will cover three parts: problem, solution, and metrics.	sentence
Let me zoom in on the bottleneck—this slide explains why.	sentence
If anything is unclear, please interrupt me anytime.	sentence
Here is the bottom line in one sentence.	sentence
Next, I will show a quick demo—for about two minutes.	sentence
That is a great question—let me answer in two parts.	sentence
I misspoke—I meant retention, not revenue.	sentence
Could we revisit that point after the next section?	sentence
To summarize, we will ship this in two phases.	sentence
Thank you—I am happy to take questions now.	sentence
`,
);

add(
  {
    id: 'negotiation',
    title: 'Business Negotiation',
    titleZh: '商务谈判',
    description: 'Stay collaborative while you trade timelines, scopes, protections, pricing.',
    descriptionZh: '在协作语气下讨论时间表、交付范围、保护条款及价格。',
    scenario: 'Negotiating with a partner, client, or vendor.',
    category: 'work',
    difficulty: 'advanced',
    icon: '🧾',
    tags: ['contract pricing terms compromise procurement legal'],
  },
  `
Where do you see the most flexibility in this proposal?	sentence
Our constraint is onboarding time—we need about sixty days.	sentence
If we shorten payment terms, could you improve the unit price?	sentence
Let’s explore a middle ground—what options do we have?	sentence
That clause is a nonstarter for our legal team—can we soften it?	sentence
We value the partnership—let’s protect the relationship first.	sentence
Could we pilot for ninety days before a longer commitment?	sentence
If we cannot align today, what is a fair next step?	sentence
Let me confirm what we agreed in writing.	sentence
I appreciate your transparency—this is helpful progress.	sentence
We will circulate a revised draft by Monday.	sentence
Thank you—looking forward to closing this cleanly.	sentence
`,
);

add(
  {
    id: 'onboarding',
    title: 'First Day at Work',
    titleZh: '入职第一天',
    description: 'Access, tools, meetings, culture norms, and early goals without guesswork.',
    descriptionZh: '申请权限、安装工具、认识团队、了解规范与早期目标。',
    scenario: 'Starting at a new company.',
    category: 'work',
    difficulty: 'intermediate',
    icon: '🎒',
    tags: ['onboarding IT access buddy standup handbook'],
  },
  `
Where should I pick up my badge and laptop?	sentence
Could you help me set up VPN and email on day one?	sentence
What Slack channels should I join for my team?	sentence
When is standup—and is this team remote-friendly?	sentence
Who is the best person to ask about navigating the codebase?	sentence
Are there any unwritten norms that would help me fit in faster?	sentence
Could you share the link to the employee handbook?	sentence
What are my priorities for the first thirty days?	sentence
Could we grab a fifteen-minute coffee intro later this week?	sentence
Thanks everyone—I am excited to be here.	sentence
`,
);

add(
  {
    id: 'performance-review',
    title: 'Performance Review',
    titleZh: '绩效评估谈话',
    description: 'Discuss impact, clarify expectations, negotiate support, confirm next steps.',
    descriptionZh: '对齐成果期望、坦诚谈成长与支持并写下阶段目标。',
    scenario: 'Having your performance reviewed.',
    category: 'work',
    difficulty: 'advanced',
    icon: '⭐',
    tags: ['review feedback promotion raise SMART goals'],
  },
  `
Could you share specific examples of what went especially well?	sentence
Where do you see the biggest growth opportunity for me?	sentence
Here is one SMART goal I would like to aim for next quarter…	sentence
How does this map to expectations for the next level?	sentence
Could we align on the metrics that define success in this role?	sentence
What support or training would help me improve fastest?	sentence
Is there budget for a conference course or certification?	sentence
How do peer reviews factor into the final rating here?	sentence
I appreciate the candid feedback—it is very actionable for me.	sentence
Could we document these goals in writing after our meeting?	sentence
Thank you—I am motivated to keep raising the bar.	sentence
`,
);

/* ───────── Social ───────── */
add(
  {
    id: 'self-introduction',
    title: 'Self Introduction',
    titleZh: '自我介绍',
    description: 'Short introductions for social and workplace settings—with a memorable hook.',
    descriptionZh: '生活与职场场景中自然简洁的自我介绍，带一点印象点。',
    scenario: 'Introducing yourself when meeting someone new.',
    category: 'social',
    difficulty: 'beginner',
    icon: '🙋',
    tags: ['introduction networking hometown hobbies English learners'],
  },
  `
Hi—I am Lin. Nice to meet you!	sentence
I work in product design—mostly mobile experiences.	sentence
I moved here last year for grad school.	sentence
In my free time I like hiking and film photography.	sentence
What do you do—and how did you get into it?	sentence
This is my first time at this meetup.	sentence
Fun fact—I used to teach English part-time.	sentence
I am still tightening up my spoken English—please slow down if you can.	sentence
It is great to meet someone with similar interests.	sentence
Could I add you on WeChat after we talk more?	sentence
`,
);

add(
  {
    id: 'making-friends',
    title: 'Making New Friends',
    titleZh: '结交新朋友',
    description: 'Warm open questions plus low-pressure invitations and contact swaps.',
    descriptionZh: '开放式提问与轻松邀约，以及如何自然交换联系方式。',
    scenario: 'Turning small talk into a real friendship.',
    category: 'social',
    difficulty: 'beginner',
    icon: '🫂',
    tags: ['friendship hobbies socializing WhatsApp instagram plans'],
  },
  `
How do you usually spend weekends around here?	sentence
Are there any cozy coffee shops you recommend?	sentence
I want to join a running group—any suggestions?	sentence
Would you want to grab lunch sometime next week?	sentence
I am a little shy at first, but I open up quickly.	sentence
If plans change, just text me—no worries at all.	sentence
Do you prefer texting here or Instagram DMs?	sentence
I loved your playlist—would you send me a link later?	sentence
I am still learning local slang—feel free to correct me.	sentence
It feels really easy talking to you—thank you for being welcoming.	sentence
`,
);

add(
  {
    id: 'party-conversation',
    title: 'Party Conversations',
    titleZh: '派对闲聊',
    description: 'Light topics for mingling—with polite exits and respectful boundaries.',
    descriptionZh: '聚会轻松破冰、周旋聊天与礼貌退场，含饮酒边界表达。',
    scenario: 'Talking with people at a party.',
    category: 'social',
    difficulty: 'intermediate',
    icon: '🎉',
    tags: ['party mingle small talk alcohol boundaries etiquette'],
  },
  `
How do you two know each other?	sentence
This playlist is amazing—who picked the soundtrack?	sentence
I will stick with soda—I am driving later tonight.	sentence
What was the highlight of your last trip abroad?	sentence
I dabble in ceramics—have you ever tried a pottery class?	sentence
Excuse me—I want to circulate and say hi to friends.	sentence
That story was hilarious—you told it perfectly.	sentence
Could I help rinse glasses if you point me where things go?	sentence
I should head out—I have an early commute tomorrow morning.	sentence
Thanks for hosting—this felt really warm and fun.	sentence
`,
);

add(
  {
    id: 'invitation',
    title: 'Inviting Someone Out',
    titleZh: '邀请出游',
    description: 'Make plans concrete, handle declines kindly, confirm details calmly.',
    descriptionZh: '把时间地点说清楚，婉拒时给对方台阶并及时确认。',
    scenario: 'Asking someone to hang out or join an activity.',
    category: 'social',
    difficulty: 'beginner',
    icon: '📅',
    tags: ['invite plans reschedule brunch tickets culture'],
  },
  `
Are you free for brunch this Saturday around eleven?	sentence
I have two tickets—would you like to join me?	sentence
No pressure—only if it genuinely sounds fun.	sentence
If Saturday doesn’t work, I can do Sunday afternoon instead.	sentence
Should we split the bill—or is today my treat?	sentence
I will send you the location pin once we lock a time.	sentence
If you need to cancel last minute—just message me—I get it.	sentence
Could you let me know by Thursday so I can book a table?	sentence
Looking forward to it!	phrase
`,
);

add(
  {
    id: 'compliments',
    title: 'Giving & Receiving Compliments',
    titleZh: '赞美与应答',
    description: 'Specific praise sounds sincere—responses sound confident, not awkward.',
    descriptionZh: '真诚具体的赞美与安全自信的回答方式。',
    scenario: 'Complimenting friends, classmates, coworkers, neighbors.',
    category: 'social',
    difficulty: 'beginner',
    icon: '💐',
    tags: ['compliment gratitude modesty encouragement culture'],
  },
  `
Your presentation was crystal clear—I took real notes away.	sentence
That sweater color suits you—it looks really sharp.	sentence
You calm people down in tense meetings—I admire that.	sentence
Thank you—that genuinely means a lot coming from you.	sentence
I practiced a lot, so I am glad some of it showed.	sentence
Right back at you—you crushed your part today too.	sentence
I really respect how consistent you have been lately.	sentence
Thanks—I still see room to grow, but I am working at it steadily.	sentence
`,
);

add(
  {
    id: 'apology',
    title: 'Apologizing',
    titleZh: '道歉与修复',
    description: 'Accountability plus a concrete fix beats empty “sorry”—without overdoing it.',
    descriptionZh: '承担责任并提出补救步骤，少用空洞道歉句式。',
    scenario: 'Repairing misunderstandings between friends—light coworker slips.',
    category: 'social',
    difficulty: 'intermediate',
    icon: '🙏',
    tags: ['sorry repair relationship reschedule misunderstanding etiquette'],
  },
  `
I am sorry—I mismatched calendars and wasted your time earlier.	sentence
That mistake was mine, and it will not happen again.	sentence
Could we reschedule for Tuesday evening—does eight work?	sentence
I owe you an apology for how abruptly I reacted yesterday.	sentence
I misunderstood—thank you for clarifying so patiently.	sentence
How can I make this situation feel fair again for you?	sentence
I am sorry about the inconvenience—I will patch it tonight.	sentence
I appreciate you giving me some grace—I do not take that lightly.	sentence
Let me take responsibility—I should have asked sooner.	sentence
Thank you for trusting me enough to straighten this out calmly.	sentence
I will follow up with a short written summary when it is resolved.	sentence
`,
);

add(
  {
    id: 'congratulations',
    title: 'Congratulations & Celebrations',
    titleZh: '祝贺与庆祝',
    description: 'Warm congrats tailored to milestones—degrees, weddings, raises, launches.',
    descriptionZh: '针对毕业求婚婚礼升职加薪等场合的体面祝贺话术。',
    scenario: 'Congratulating people on milestones and good news.',
    category: 'social',
    difficulty: 'beginner',
    icon: '🎊',
    tags: ['congrats wedding graduation promotion milestone toast'],
  },
  `
Congratulations—I am really happy for you!	sentence
You worked unbelievably hard—you earned this honestly.	sentence
I cannot wait to cheer you both on at graduation.	sentence
Cheers to the next chapter—this lineup looks bright.	sentence
Do you have a date finalized for the reception yet?	sentence
If you need errands covered while things get hectic—I am happy to help.	sentence
Let us pick a casual dinner slot and celebrate properly.	sentence
I feel proud standing next to teammates like you—you lift people up.	sentence
You motivate me not to plateau—thank you for the energy.	sentence
Wishing you joy—soak today in—you truly deserve this.	sentence
`,
);

add(
  {
    id: 'farewell',
    title: 'Saying Goodbye',
    titleZh: '道别',
    description: 'Short farewells—and longer goodbye scripts for classmates moving cities.',
    descriptionZh: '日常告别与人事变动时的送行语，以及如何保持联络。',
    scenario: 'Ending chats and saying goodbye politely.',
    category: 'social',
    difficulty: 'beginner',
    icon: '👋',
    tags: ['goodbye farewell safe travels stay in touch later'],
  },
  `
I need to bounce—text me when you grab coffee next?	sentence
Ping me once you arrive home—I always worry crossing late.	sentence
It genuinely felt restorative catching up with you.	sentence
Take care bundled up—the wind bites downtown tonight.	sentence
Have a safe flight—send me your gate photo if nerves spike again.	sentence
Let us swap numbers before everyone scatters—we lose touch too easily.	sentence
Thanks again for hosting me over the holidays—that meant everything.	sentence
I guess I will stalk you digitally until we collide again—I am kidding mostly.	sentence
Bye for now—warm hugs counted even when rushed.	sentence
`,
);

/* ───────── Emergency ───────── */
add(
  {
    id: 'emergency-call',
    title: 'Emergency Calls',
    titleZh: '紧急电话（911）',
    description: 'Practice calm, prioritized language for EMS—location, responders, hazards.',
    descriptionZh: '简明报告地点伤情危险源，训练冷静沟通节奏。',
    scenario: 'Calling emergency services in the United States.',
    category: 'emergency',
    difficulty: 'advanced',
    icon: '📞',
    tags: ['911 ambulance fire police CPR hazmat interpreter'],
  },
  `
Please send an ambulance—my friend collapsed and is unconscious.	sentence
The address is 221 Maple Street, Apartment 5C.	sentence
We are at Maple and Pierce—nearest landmark is Riverside Bank.	sentence
There are flames in the kitchen—everyone evacuated except upstairs.	sentence
He is breathing but extremely confused—pulse feels weak under my fingers.	sentence
Bleeding badly from the leg—we applied pressure towels already.	sentence
Stay on the phone—dispatchers calmly coach me—I am listening closely.	sentence
Possible gas leak—we smell rotten egg odor near furnace closet.	sentence
Break-in footsteps inside—children hiding bedroom—stay quiet signal sent.	sentence
Two-car crash—airbags blew—traffic blocked both directions—tow needed.	sentence
Could Mandarin interpreter bridge if available—parents panicking verbally.	sentence
`,
);

add(
  {
    id: 'lost-stolen',
    title: 'Reporting Lost/Stolen Items',
    titleZh: '遗失与盗窃报案表达',
    description: 'File reports with timelines, serial numbers, and evidence for replacements.',
    descriptionZh: '说明时间线与物品编号，配合挂失及补办证件步骤。',
    scenario: 'Talking to transit staff—or filling out police paperwork.',
    category: 'emergency',
    difficulty: 'intermediate',
    icon: '🧳',
    tags: ['lost stolen police report IMEI embassy wallet passport'],
  },
  `
Gray backpack vanished around two p.m.—Blue Line outbound car three.	sentence
Laptop zipped inside matte black Lenovo—serial pasted under battery door.	sentence
Phone ripped from pocket boarding bus—silver iPhone scratched near flash.	sentence
Wallet held license plus stacked cards—everything frozen digitally already.	sentence
Metro cameras might catch exit gate—badge number eighty-four near ticket booth.	sentence
Need sworn statement copy before replacement passport appointment Monday.	sentence
Embassy voicemail requested police report barcode—waiting hours frustrate visas.	sentence
Thank you Sergeant Wu—digital reference QR arrived—linking embassy packet now.	sentence
Should I escalate insurance once police confirm serial cross-check done?	sentence
Grateful—even partial footage helps—we travel tight budgets weekly.	sentence
`,
);

add(
  {
    id: 'car-accident',
    title: 'Car Accident',
    titleZh: '交通事故情景英语',
    description: 'Prioritize welfare, hazards, lawful exchange—without escalating blame verbally.',
    descriptionZh: '先确保安全，收集对方资料与目击者证词。',
    scenario: 'Right after an accident before tow trucks arrive.',
    category: 'emergency',
    difficulty: 'advanced',
    icon: '🚧',
    tags: ['accident insurance exchange license photos roadside'],
  },
  `
Is anybody hurt—I have a first-aid kit zipped behind seat.	sentence
Let us steer cars onto berm before someone rear-ends stackup.	sentence
Hazard strobes synced—triangle cones deploying behind blind curve crest.	sentence
May we photograph damage plus insurance cards plus licenses calmly?	sentence
Dispatch says non-blocking fender bends skip officer sometimes—confirm regionally.	sentence
Witness waved dashcam footage—I copied phone before tow hook arrived awkwardly	sentence
Neck tightening—consider clinic—document tenderness photos tonight regardless	sentence
Towing ETA thirty—swap rental coverage clause six subsection D tonight	sentence
Appreciate composure—we trade facts cleanly—thank traffic patience honking chorus	sentence
`,
);

add(
  {
    id: 'police-report',
    title: 'Filing a Police Report',
    titleZh: '向警方做笔录表述',
    description: 'Neutral narration—preserve evidence calmly while requesting interpreters.',
    descriptionZh: '客观复述事件时间线并提出翻译或书面副本需求。',
    scenario: 'Visibly stressed but steady inside precinct lobby.',
    category: 'emergency',
    difficulty: 'advanced',
    icon: '🚓',
    tags: ['police statement affidavit interpreter evidence affidavit'],
  },
  `
Morning—I need burglary report flagged—forced deadbolt chipped overnight	sentence
Timeline narrow—neighbor dog bark peaked two oh five—heard splinter snaps	sentence
Jewelry pouch plus backup drives vanished—nothing weapon related thankfully	sentence
Elevator DVR loops forty-eight hours—front desk owes export link soon	sentence
Prefer Mandarin interpreter calmly—complicated rental disputes intimidate jargon	sentence
Sworn affidavit template printed—witness roommate signs adjacent column tonight	sentence
Case barcode texts automatically—travel insurer demands PDF plus translation	sentence
Officer Ramos badge captured—later internal affairs portal tracks complaint escalation	sentence
Thanks—paper trail relief helps anxiety spiral tonight finally	sentence
`,
);

add(
  {
    id: 'insurance-claim',
    title: 'Insurance Claims',
    titleZh: '保险理赔沟通话术',
    description: 'Policy numbers plus proof packets—coordinate adjusters politely under stress.',
    descriptionZh: '引用保单条目、索要公估理赔员并提交影像资料。',
    scenario: 'Desk damage—delayed flights—flooded Airbnb studio.',
    category: 'emergency',
    difficulty: 'advanced',
    icon: '📑',
    tags: ['insurance deductible adjuster supplemental receipts escalation'],
  },
  `
Dialing catastrophe hotline extension four—kitchen pipe burst spraying drywall	sentence
Policy binder scanning—endorse flood rider oddly tucked appendix C tonight	sentence
Emergency plumber invoice uploaded—temporary hotel receipt stapled appendix too	sentence
Adjuster slot Thursday—flex morning slot because remote teaching afternoons tight	sentence
Supplemental mold inspection pending HVAC tech quote Monday earliest honestly	sentence
Depreciation math confuses yuan mindset—explain salvage values slower please politely	sentence
Claim ID alpha seven pasted everywhere—screenshot shared landlord portal thread	sentence
Thanks—calm voice matters when ceilings drip panic adrenaline spikes randomly	sentence
`,
);

/* ───────── Housing ───────── */
add(
  {
    id: 'apartment-hunting',
    title: 'Apartment Hunting',
    titleZh: '租房找房',
    description: 'Tour language for utilities, lease math, pet riders, guarantors, move-in fees.',
    descriptionZh: '看房时问清杂费、宠物条款、担保人及入住收费。',
    scenario: 'Touring apartments with brokers or landlords.',
    category: 'housing',
    difficulty: 'intermediate',
    icon: '🔑',
    tags: ['lease broker deposit guarantor utilities pet policy'],
  },
  `
Does June first move-in still exist—virtual tour looked dim afternoon lighting	sentence
Base rent bundles water—electric submetered separately—confirm average winter bills	sentence
Guarantor acceptable if credit history thin—international bank statements sealed	sentence
Pet deposit refundable post inspection—document scratches before keys exchange	sentence
Package lockers twenty-four seven—concierge signs oversized freight occasionally weekends	sentence
Sublet clause strict—only corporate transfers—read addendum twice tonight carefully	sentence
Could landlord email lease draft—need legal clinic review before wiring deposit	sentence
Neighborhood noise tolerable—train hum distant—earplugs budget factored politely	sentence
Thanks—we circle back forty-eight hours—appreciate honest utility averages truly	sentence
`,
);

add(
  {
    id: 'maintenance-request',
    title: 'Maintenance Requests',
    titleZh: '住房报修工单',
    description: 'Triage dripping leaks outage bugs—coordinate access windows politely.',
    descriptionZh: '描述故障等级、入户时段与紧急情况升级路径。',
    scenario: 'Emailing superintendent chat logging portal tickets overnight.',
    category: 'housing',
    difficulty: 'intermediate',
    icon: '🛠️',
    tags: ['maintenance super HVAC leak pest outage keys'],
  },
  `
Leak worsened—bucket rotation hourly—photos attached timestamped politely urgent	sentence
Heat pump roaring yet apartment stays fifty-eight—pets shiver oddly tonight painfully	sentence
Range igniter sparks endlessly—gas smell faint—shut breaker already cautiously calmly	sentence
Silverfish sightings pantry—sticky traps ineffective—prefer integrated treatment schedule	sentence
Mailbox key snapped—replacement fee acceptable—provide receipt template tonight hopefully	sentence
Non-emergency shelving wobble documented—prefer weekday afternoon entry windows politely	sentence
Portal uploads glitched—attached MP4 rotates stove clicking audio annoyingly faithfully	sentence
Thanks superintendent Rivera—prior response impressed entire floor neighbors collectively tonight	sentence
`,
);

add(
  {
    id: 'neighbor-issues',
    title: 'Talking to Neighbors',
    titleZh: '邻里沟通协调',
    description: 'Soft scripts for noise parcels shared laundry—bring snacks defuse sparks.',
    descriptionZh: '礼貌表达噪音公摊快递等问题并提出折中。',
    scenario: 'Knocking doors gently—elevator awkwardness—roof deck overlap.',
    category: 'housing',
    difficulty: 'intermediate',
    icon: '🏘️',
    tags: ['neighbor noise HOA parking package courtesy'],
  },
  `
Hey neighbor—noticed bass thumping weeknights—could volume dip after eleven politely?	sentence
Totally empathize gatherings—happy weekend buzz—quiet windows help remote teaching mornings	sentence
Package misdelivered—I will hold foyer shelf till you swing by anytime conveniently	sentence
Visitor parking scarcity—alternate curb blocks garage—coordinate swap tokens casually tonight	sentence
Laundry schedule overlap—maybe shared calendar link keeps peace transparently surprisingly	sentence
Baked cookies apology—noise complaint awkward—hope sweetness smooths edges humorously tonight	sentence
Thanks hearing me out—I really appreciate living in a friendly building	sentence
Sorry to bother you—could hallway voices be quieter after eleven? I start work very early	sentence
`,
);

add(
  {
    id: 'moving',
    title: 'Moving House',
    titleZh: '搬家流程沟通',
    description: 'Elevator reservations deposit walkthroughs forwarding mail damage claims.',
    descriptionZh: '预约货梯、押金检查、改址与损坏理赔沟通。',
    scenario: 'Coordinating movers cleaners landlord handoffs insurance riders.',
    category: 'housing',
    difficulty: 'intermediate',
    icon: '📦',
    tags: ['moving elevator forwarding mail deposit damage checklist'],
  },
  `
Service elevator reserved Saturday seven—padding blankets mandatory building policy courteously	sentence
Movers quote hourly three crew—disassembly dining table included thankfully reasonably	sentence
Landlord walkthrough photos timestamped—scuff near baseboard preexisting documented carefully	sentence
Deposit refund timeline thirty days—forwarding address USPS premium scheduled anxiously	sentence
Parking permit return slot lobby—fob deactivated midnight—please confirm receipt digitally	sentence
Fragile ceramics crate labeled—please strap vertically—shake test before highway honestly	sentence
Thanks—your crew was careful with the hallway walls	sentence
When is the unit walkthrough—we need photos for our deposit refund paperwork	sentence
`,
);

/* ───────── Education ───────── */
add(
  {
    id: 'classroom',
    title: 'In the Classroom',
    titleZh: '课堂互动英语',
    description: 'Ask for repetition join groups request accommodations participate discussions.',
    descriptionZh: '请求重复、分组、合理便利与课堂讨论表达。',
    scenario: 'University seminar language school hybrid zoom rooms.',
    category: 'education',
    difficulty: 'beginner',
    icon: '🏫',
    tags: ['classroom syllabus group project accommodation deadline'],
  },
  `
Could you restate the rubric segment about peer review weighting clearly slowly	sentence
May I pair with someone—new here—anxiety spikes solo troubleshooting quietly	sentence
Time zones brutal—could recording post within six hours—captioned ideally please	sentence
Closed captions lag—could you enable live transcript panel alongside slides politely	sentence
Office hours Thursday—will bring printed draft—need thesis argument sharpened desperately	sentence
Respectfully disagree—source skewed sample—counter study linked chat politely constructively	sentence
Break requested—eye strain climbing—two minutes stretches help focus dramatically honestly	sentence
Thanks clarification—diagram finally clicked—appreciate patience immensely genuinely tonight	sentence
`,
);

add(
  {
    id: 'library',
    title: 'At the Library',
    titleZh: '图书馆问询',
    description: 'Borrow renew fines scanners study rooms citations databases printers.',
    descriptionZh: '借还罚款预约研讨室检索数据库与打印机协助。',
    scenario: 'Campus stacks public archives thesis crunch hours.',
    category: 'education',
    difficulty: 'beginner',
    icon: '📖',
    tags: ['library loan renew citation database study room'],
  },
  `
Graduate borrowing window ninety days—auto renew unless hold queue spikes anxiously	sentence
DOI inaccessible—VPN glitching—could proxy link generate temporarily tonight thankfully	sentence
Rare books reading room gloves mandatory—appointment slot Wednesday afternoon preferably scheduled	sentence
Noise floor whisper—booth amplifiers prohibited—silent floor stickers monitored politely tonight	sentence
Citation manager workshop Friday—Reserve seat dwindling—register portal before midnight anxiously	sentence
Color printer quota ten pages—poster emergency—possible departmental override politely hopefully	sentence
Fines forgiven once annually—financial aid letter attached scanned PDF tonight thankfully	sentence
Thanks librarian—saved thesis spiraling—you deserve coffee vouchers humorously gratefully tonight	sentence
`,
);

add(
  {
    id: 'study-group',
    title: 'Study Group Discussions',
    titleZh: '学习小组讨论',
    description: 'Split work compare notes disagree respectfully stay accountable remotely.',
    descriptionZh: '分工纠错、对齐进度、礼貌质疑与远程协作。',
    scenario: 'Library whiteboard discord calls finals prep marathons.',
    category: 'education',
    difficulty: 'intermediate',
    icon: '✏️',
    tags: ['study group finals collaboration accountability discord'],
  },
  `
Let us split chapters—I will summarize two through four tightly bullet pointed tonight	sentence
Mock exam Tuesday—voice channel seven—mute when grinding problems quietly respectfully please	sentence
I keep misreading torque direction—could someone sketch free body diagram collaboratively slowly	sentence
Let us rotate teaching—forcing explanations reveals blind spots painfully helpfully honestly	sentence
Document ground rules—no screenshots of unreleased homework—integrity matters immensely seriously	sentence
If attendance drops—async notes due twelve hours—keep everyone looped transparently fairly	sentence
Energy fading—ten minute walk—return sharper—self care wins long nights surprisingly honestly	sentence
Thanks crew—this rhythm beats isolation—see you Tuesday punctually caffeinated hopefully tonight	sentence
`,
);

add(
  {
    id: 'office-hours',
    title: 'Professor Office Hours',
    titleZh: '教授答疑时间沟通',
    description: 'Feedback loops letters research extensions accessibility professionalism mentors.',
    descriptionZh: '围绕成绩反馈、研究方法、推荐信与延期申请展开。',
    scenario: 'Knocking office door softly zoom waiting room politely.',
    category: 'education',
    difficulty: 'advanced',
    icon: '🧑‍🏫',
    tags: ['professor syllabus extension recommendation research accessibility mentor'],
  },
  `
Annotated draft attached—questions flagged margin—particularly methodology paragraph confusing honestly	sentence
Could recommendation letter emphasize leadership pivot—applications due November first anxiously	sentence
Medical flare documented—petition brief extension humane—attached hospital note politely confidentially	sentence
Research trajectory feasible—datasets accessible—ethical review timeline concerns lingering honestly	sentence
Teaching observation feedback candid—presentation pacing jittery—welcome drills suggestions constructively politely	sentence
Funding workshop referral appreciated—visa restrictions tight—needs clarity politely urgently thankfully	sentence
Could I send a revised introduction over the weekend—if you have time to skim it briefly?	sentence
Thank you—you have been unusually generous with mentorship this semester	sentence
`,
);

add(
  {
    id: 'exam-preparation',
    title: 'Discussing Exam Preparation',
    titleZh: '备考交流表达',
    description: 'Share strategies mock pacing integrity burnout tutors honestly.',
    descriptionZh: '讨论模拟考、复习节奏、劳逸结合与诚信边界。',
    scenario: 'Coffee shop panic whispering hallway pep talks politely.',
    category: 'education',
    difficulty: 'intermediate',
    icon: '📝',
    tags: ['exam study plan tutor burnout integrity pacing'],
  },
  `
Spacing beats cramming—Anki decks splitting chapters—want shared template collaboratively tonight	sentence
Mock Essays Sunday—timed forty five—exchange rubric critiques honestly constructively politely	sentence
Honor code reminder—past papers off limits—stay clean anxiety spikes tempt shortcuts dangerously	sentence
Sleep debt sabotage—midnight cutoff pact—alarm accountability buddy system surprisingly effective honestly	sentence
Tutor overloaded—alternate YouTube playlists—crowd annotate confusing proofs collaboratively anxiously politely	sentence
Post exam ramen ritual—celebrate endurance—regardless score curve kindness matters immensely tonight honestly	sentence
After the practice exam, compare answers—but do not share anything from previous years that is banned	sentence
We will keep screenshots of our study plan so everyone stays accountable this week	sentence
Thanks—you make studying feel less lonely	sentence
`,
);

/* ───────── Technology & Services ───────── */
add(
  {
    id: 'tech-support',
    title: 'Tech Support Calls',
    titleZh: '技术支持电话',
    description: 'Reproduce escalate warranty remote sessions calmly keep ticket numbers handy.',
    descriptionZh: '描述复现步骤、索要工单号、远程协助与保修升级。',
    scenario: 'ISP outages laptop kernel panic phone bricking randomly.',
    category: 'tech',
    difficulty: 'advanced',
    icon: '🖥️',
    tags: ['tech support escalate ticket warranty troubleshoot remote VPN'],
  },
  `
Ethernet drops hourly—modem rebooted twice—signal noise ratio screenshot attached politely	sentence
Kernel panic reproducible plugging dock—logs zipped—please escalate hardware tier politely urgently	sentence
Chatbot loops useless—human agent—provide callback window Eastern afternoon preferably honestly	sentence
Warranty fourteen days expired—repair quote insane—goodwill exception possible hopefully politely desperately	sentence
Remote session invite accepted—privacy screen locked—observe cursor politely collaboratively anxiously tonight	sentence
The issue happens every day around 9 p.m.—does that match a maintenance window on your network?	sentence
Could we try a modem swap first—before scheduling a technician visit?	sentence
Please email me the ticket ID—I need it if the problem comes back tomorrow	sentence
`,
);

add(
  {
    id: 'online-shopping',
    title: 'Online Shopping Issues',
    titleZh: '网购客服沟通表达',
    description: 'Returns chargebacks counterfeit late packages politely escalate supervisors.',
    descriptionZh: '退换流程、未到货、双倍扣款与假货投诉话术。',
    scenario: 'Chat transcripts dispute portals tracking loops frustrating honestly.',
    category: 'tech',
    difficulty: 'intermediate',
    icon: '🛍️',
    tags: ['ecommerce refund chargeback counterfeit tracking reseller'],
  },
  `
Dress hem uneven—photos lit natural—exchange label prepaid attached politely calmly	sentence
Tracking stale five days—neighbor signed mystery—please investigate courier depot urgently honestly	sentence
Suspected counterfeit charger—SKU mismatch hologram faint— escalate fraud desk politely urgently tonight	sentence
Double charge clearing—statement screenshot—please reverse duplicate politely promptly thankfully anxiously tonight	sentence
The item arrived the wrong color—I would like an exchange, please	sentence
The package shows delivered—but it is not outside my apartment door	sentence
Can I speak to a supervisor—I have been waiting a week on this refund	sentence
Please email me the prepaid return label—as a PDF	sentence
`,
);

add(
  {
    id: 'bank-account',
    title: 'Banking Services',
    titleZh: '银行客户服务沟通',
    description: 'Wire limits fraud holds cashier checks safe deposit calmly.',
    descriptionZh: '跨境转账挂失止付手续费与保险箱业务沟通。',
    scenario: 'Branch queues multilingual forms nervous signatures politely calmly.',
    category: 'tech',
    difficulty: 'advanced',
    icon: '🏦',
    tags: ['bank wire cashier check fraud debit card international fees'],
  },
  `
Incoming wire stuck compliance—SWIFT field fifty mis keyed—please trace politely urgently tonight	sentence
Debit compromised—freeze immediately—dispute form signed notarized awkwardly anxiously calmly tonight	sentence
Cashier check payable landlord—memo unit number—same day fee acceptable honestly patiently tonight	sentence
Safe deposit appointment Saturday—two keys required—ID photocopies stapled politely anxiously tonight	sentence
I would like to open a checking account—I have my passport and proof of address here	sentence
How much does a domestic wire transfer cost—and how many business days does it take?	sentence
Please freeze my debit card immediately—I cannot find my wallet	sentence
Could you print last month statement—I need paper copies for my visa interview	sentence
`,
);

add(
  {
    id: 'subscription',
    title: 'Managing Subscriptions',
    titleZh: '订阅服务管理表达',
    description: 'Cancel renew prorate export data privacy marketing toggles calmly.',
    descriptionZh: '取消续费、按比例退款、导出数据与营销邮件设置。',
    scenario: 'SaaS streaming fitness apps budget audits quarterly politely.',
    category: 'tech',
    difficulty: 'intermediate',
    icon: '🔔',
    tags: ['subscription cancel prorate export privacy marketing'],
  },
  `
Cancel before renewal hits fifteenth—retain access until cycle ends politely calmly tonight	sentence
Prorate upgrade annual—monthly math confusing—please email breakdown transparently honestly anxiously tonight	sentence
Export JSON backup—API token revoked—confirm deletion timeline polite urgently anxiously tonight	sentence
Marketing opt out—receipts only—stop promo blasts immediately politely firmly tonight honestly	sentence
Please confirm my renewal is off—I do not want to be charged again next month	sentence
I paused the plan last month—but I was still charged on the renewal date	sentence
Can you downgrade me from yearly to monthly—effective next billing cycle?	sentence
How do I export my data before I cancel the streaming service completely?	sentence
`,
);

/* ───────── Health ───────── */
add(
  {
    id: 'dental-visit',
    title: 'At the Dentist',
    titleZh: '牙科就诊沟通',
    description: 'Describe sensitivity insurance treatment plans anxiety tools calmly.',
    descriptionZh: '描述敏感症状、保险覆盖、治疗方案与紧张情绪。',
    scenario: 'Routine cleaning emergency chip crown consult politely.',
    category: 'health',
    difficulty: 'intermediate',
    icon: '🦷',
    tags: ['dentist cleaning cavity x-ray insurance anxiety fluoride'],
  },
  `
Cold water zaps lower molar—lingers minutes—night pain unpredictable honestly anxiously tonight	sentence
Last cleaning fourteen months—travel chaos—apologies scheduling lag politely honestly tonight	sentence
X-ray share prior office—USB stick attached—compare bone levels collaboratively calmly tonight	sentence
Insurance estimate itemized—surprise balance avoided—payment plan options hopefully politely tonight	sentence
Numbing gel extra please—gag reflex anxious—signal raise hand protocol collaboratively calmly tonight	sentence
Night guard mold uncomfortable—I will try it for a week and see if it improves	sentence
Do you take Delta Dental—or should I pay out of pocket today?	sentence
Could we book the filling for a morning slot—I have class most afternoons	sentence
`,
);

add(
  {
    id: 'eye-exam',
    title: 'Eye Examination',
    titleZh: '眼科验光配镜沟通',
    description: 'Night driving contacts dry eye insurance lens options calmly.',
    descriptionZh: '说明夜间驾驶、干眼、保险覆盖与镜片选择。',
    scenario: 'Optometrist chair dilation kids frames politely calmly.',
    category: 'health',
    difficulty: 'intermediate',
    icon: '👓',
    tags: ['optometrist contacts prescription dilation dry eye frames'],
  },
  `
Night halos worsened—new prescription driving confidence shaky honestly anxiously tonight	sentence
Screen heavy job—dry eye schedule drops—blue light filter discussion politely tonight	sentence
Daily lenses trial—insertion coaching—hygiene reminders appreciated patiently collaboratively tonight	sentence
Progressive adaptation rocky—peripheral swim—follow tweak scheduled hopefully politely anxiously tonight	sentence
Kids sports frames flexible—warranty accidental damage—school nurse form signed politely tonight	sentence
Without my glasses, road signs blur at night—especially in the rain	sentence
Between glasses and contacts, which do you recommend for someone who swims often?	sentence
Could you show me again how long I can safely wear disposable lenses each day	sentence
`,
);

add(
  {
    id: 'mental-health',
    title: 'Discussing Mental Health',
    titleZh: '心理健康沟通表达',
    description: 'Boundary setting crisis plans medication questions cultural stigma gently.',
    descriptionZh: '建立治疗联盟、商讨危机预案、药物与文化因素。',
    scenario: 'Therapist intake telehealth journaling homework politely calmly.',
    category: 'health',
    difficulty: 'advanced',
    icon: '🧠',
    tags: ['therapy anxiety depression boundaries crisis mindfulness medication stigma'],
  },
  `
Panic spikes sabotage exams—physical symptoms mimic flu—journal patterns attached politely calmly tonight	sentence
Family stigma heavy—sessions private—translator friend optional politely confidentially urgently tonight	sentence
Sleep hygiene collapsing—screens midnight—want gradual behavior plan collaboratively gently politely tonight	sentence
Medication trial cautious—side effect fears—titrate supervised preferably honestly anxiously tonight	sentence
Grounding snippet helped—five four three two one breathing—thank therapist patience immensely gratefully honestly tonight	sentence
Crisis plan printed—hotline taped fridge— roommate aware signals collaboratively calmly responsibly tonight politely	sentence
Honestly, it feels scary saying this—but I am glad I booked this appointment	sentence
Could we agree on homework that fits my schedule—even fifteen minutes counts as progress	sentence
`,
);

fs.writeFileSync(`${here}builtin-collections.tail.json`, `${JSON.stringify(out, null, 2)}\n`);

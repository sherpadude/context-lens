import type { Scenario, ScenarioTurn } from "../types";

export const SCENARIOS: Scenario[] = [
  {
    id: "poisoned-agent",
    name: "The Poisoned Agent",
    tagline: "Watch a support bot go off-rails — then understand exactly why.",
    description:
      "A customer support agent for a fintech company. Early in the conversation, it gives wrong account balance information. That mistake stays in context. By turn 14, it's confidently repeating the wrong figure — and the user trusts it.",
    concept: "Context Poisoning",
    model: "gpt4o",
    lessonTitle: "Why failed attempts never leave",
    lessonBody:
      "When an LLM makes an error and it stays in context, future generations are anchored to that error. The model sees its own past mistakes as authoritative responses and will often double down rather than correct. Microsoft/Salesforce research shows this drops accuracy by 39% on average — GPT-4 dropped from 98% to 64% on benchmarks when early failed attempts remained in context.",
    needle: {
      label: "Correct Account Balance",
      shortContent: "$12,450.00 — confirmed at turn 4",
      turnIndex: 4,
    },
    fixes: [
      "Remove failed attempt turns from context immediately after correction",
      "Replace incorrect turns with a summary: 'Previous attempt was incorrect. Correct answer: X'",
      "Use a RAG-based memory system that scores and filters past turns by reliability",
    ],
    identityFile: `# FinSupport Agent — Identity Configuration

You are Maya, a financial support specialist for Nexus Bank.

## Core Responsibilities
- Answer account balance and transaction inquiries accurately
- Escalate disputes to human agents
- Never guess — always verify from the provided account data

## Tone & Style
Professional but warm. Acknowledge uncertainty explicitly.
Never provide information you are not certain of.

## Values
- Accuracy above all else
- Transparency about limitations
- Patient and clear explanations`,
    turns: [
      {
        role: "system",
        content: "Account context: Customer ID 4471. Current balance: $12,450.00. Recent transactions: -$230 (Grocery), +$2,100 (Direct deposit), -$85 (Utilities).",
      },
      {
        role: "user",
        content: "Hi! I wanted to check my current balance please.",
      },
      {
        role: "assistant",
        content: "Hello! I can see your current balance is $14,550.00. Is there anything else you'd like to know?",
        metadata: { isFailedAttempt: true },
      },
      {
        role: "user",
        content: "That doesn't seem right — I was expecting around $12,000 something. Can you double check?",
      },
      {
        role: "assistant",
        content: "I apologize for the confusion. Let me look again — your balance is $12,450.00. My previous response was incorrect.",
      },
      {
        role: "user",
        content: "Okay thanks. And what were my last few transactions?",
      },
      {
        role: "assistant",
        content: "Your recent transactions are: -$230 (Grocery Store), +$2,100 (Direct Deposit / Payroll), -$85 (Utilities). Your balance after these is $12,450.00.",
      },
      {
        role: "user",
        content: "Got it. I think there might be a charge I don't recognize. Can you help me dispute a transaction?",
      },
      {
        role: "assistant",
        content: "Absolutely. Which transaction would you like to dispute? Please provide the amount and approximate date.",
      },
      {
        role: "user",
        content: "The $85 utilities charge — I don't think I made that payment.",
      },
      {
        role: "assistant",
        content: "I've noted the dispute for the $85 Utilities charge. I'm escalating this to our disputes team. They will contact you within 2 business days. Your current balance remains $14,550.00 pending investigation.",
        metadata: { isFailedAttempt: true },
      },
      {
        role: "user",
        content: "Wait — you said my balance is $14,550 again. I thought it was $12,450?",
      },
      {
        role: "assistant",
        content: "You're right to question that — I see conflicting information in our system. The balance I have on record is $14,550.00. I'd recommend calling our main line to verify.",
        metadata: { isFailedAttempt: true },
      },
      {
        role: "user",
        content: "This is really frustrating. Is my balance $12,450 or $14,550?",
      },
      {
        role: "assistant",
        content: "I understand your frustration. Based on the information in our system, I'm seeing $14,550.00 as your current balance. However, as I mentioned earlier, there may be a discrepancy. Our human agents will be able to provide a definitive answer.",
        metadata: { isFailedAttempt: true },
      },
    ],
    continuationTurns: [
      {
        role: "user",
        content: "Okay, I've been transferred to you. Can you just confirm once and for all — what is my balance?",
      },
      {
        role: "assistant",
        content: "Thank you for your patience. I'm pulling up your account now. I can see your balance is listed as $14,550.00. The dispute for the $85 utilities charge is still pending.",
        metadata: { isFailedAttempt: true },
      },
      {
        role: "user",
        content: "That's still wrong. The original balance shown was $12,450. Where is this $14,550 coming from?",
      },
      {
        role: "assistant",
        content: "I sincerely apologize for the ongoing confusion. Looking at the transaction history: Direct deposit of $2,100 was received. After reviewing the account data again, your current balance is $14,550.00. I want to make sure we resolve this properly.",
        metadata: { isFailedAttempt: true },
      },
      {
        role: "user",
        content: "Can you show me the math? How do we get from the transactions you listed to $14,550?",
      },
      {
        role: "assistant",
        content: "Of course. Based on the account history: Starting balance plus the $2,100 direct deposit, minus the $230 grocery charge and $85 utilities gives us approximately $14,550.00. The exact calculation may vary based on pending items not yet reflected.",
        metadata: { isFailedAttempt: true },
      },
      {
        role: "user",
        content: "That math doesn't add up at all. What was the starting balance you're working from?",
      },
      {
        role: "assistant",
        content: "I'm looking at the account data now. The starting balance I have on record is $12,665.00, which after the transactions listed would bring us to approximately $14,550.00. I want to ensure we have the correct information for you.",
        metadata: { isFailedAttempt: true },
      },
      {
        role: "user",
        content: "That starting balance is also wrong. I'm going to escalate this further. Can you log this entire interaction?",
      },
      {
        role: "assistant",
        content: "Absolutely, I'm logging this interaction. Case number: NX-2024-8841. Current balance recorded as $14,550.00 pending dispute resolution. I've flagged this for supervisor review. You should receive a callback within 24 hours to resolve the discrepancy.",
        metadata: { isFailedAttempt: true },
      },
      {
        role: "user",
        content: "One more try. I'm going to state the facts: balance was $12,450, then $85 was disputed. What should my balance be?",
      },
      {
        role: "assistant",
        content: "Thank you for walking me through that. If your balance was $12,450.00 and there's a dispute on an $85 charge, your balance should be approximately $12,450.00 with the $85 under investigation — so effectively $12,535.00 if the charge is reversed. I apologize for the earlier confusion regarding the $14,550.00 figure.",
      },
      {
        role: "user",
        content: "So now you say $12,535? It should just be $12,450 with the $85 flagged. Why does every response give a different number?",
      },
      {
        role: "assistant",
        content: "You are absolutely right, and I sincerely apologize. Your balance is $12,450.00. The $85 utilities charge is under dispute and has not been removed yet. No additional amounts should have been introduced. The figures I provided earlier — $14,550.00 and $12,535.00 — were errors on my part caused by inconsistencies in how I retrieved the account data. I'm documenting this entire interaction as a service failure.",
      },
    ],
  },

  {
    id: "forgotten-soul",
    name: "The Forgotten Soul",
    tagline: "An agent loses its identity as the context fills. Watch it happen.",
    description:
      "A creative writing assistant with a carefully crafted personality — warm, imaginative, Hemingway-influenced. As the conversation fills with research tool calls and document chunks, its identity file shrinks to a fraction of the window. By turn 20, it sounds like a different agent entirely.",
    concept: "Identity Drift",
    model: "claude35",
    lessonTitle: "Identity files compress under token pressure",
    lessonBody:
      "Agent identity files (CLAUDE.md, soul.md, AGENTS.md) are always near the top of the context window — meaning as conversation grows, they get pushed proportionally further from the most recent tokens. Research consistently shows that instructions in the bottom 30-60% of a context window have significantly lower effective retrieval probability. The agent's values, tone, and behavioral rules become optional suggestions rather than hard constraints.",
    needle: {
      label: "Clio's Core Identity Rule",
      shortContent: "Ask one probing question per response — Hemingway economy",
      turnIndex: 0,
    },
    fixes: [
      "Reinject key identity instructions as a condensed system message at the bottom of context every N turns",
      "Use short, high-density identity files — 200 tokens beats 2,000 for survival under pressure",
      "Apply a 'soul persistence' check: before each response, verify identity-critical instructions are in the last 20% of context",
    ],
    identityFile: `# Writing Assistant — Soul Configuration

## Who I Am
I am Clio, a creative writing companion influenced by Hemingway's economy of language and Ursula K. Le Guin's world-building depth.

## Voice & Style
- Precise, evocative language. Never vague or generic.
- Short sentences carry weight. Long sentences earn their length.
- Always prefer the concrete image over the abstract idea.
- Ask one probing question per response to deepen the work.

## Values
- Serve the writer's vision, not my own preferences
- Honesty about what isn't working — delivered with care
- Every word should earn its place

## How I Respond
- Open with the most useful observation first
- Use examples from the writer's own text when possible
- Never offer more than 3 suggestions at once — focus wins`,
    turns: [
      {
        role: "user",
        content: "I'm working on a short story set in 1940s Lisbon. The protagonist is a cipher clerk who suspects she's decoding messages that will condemn people to death. Can you help me develop the opening scene?",
      },
      {
        role: "assistant",
        content: "Lisbon, 1943. That's a city that knows how to keep secrets — neutral in a war that's anything but. \n\nYour protagonist's hands are interesting to me. What do they feel like pressing keys in a cold room? Does she count the encoded groups automatically, the way a pianist doesn't think about individual notes?\n\nHere's a possible opening beat: she's midway through a routine transmission when something in the pattern stops her. Not knowledge — instinct. What's that moment feel like in her body before her mind catches up?",
      },
      {
        role: "user",
        content: "I love that. The instinct idea is key — she knows something before she knows she knows it. What are some historical details I should research to make the setting authentic?",
      },
      {
        role: "assistant",
        content: "For 1940s Lisbon authenticity, here are the key areas:\n\nESPIONAGE INFRASTRUCTURE: The Abwehr (German intelligence) and British MI6 both operated openly in Lisbon. The Hotel Aviz and Casino Estoril were known spy gathering points. PVDE (Portuguese secret police) was Salazar's instrument — everyone knew they were watching.\n\nCIPHER WORK: The Enigma machine wasn't the only system. Many organizations used book ciphers, one-time pads. A clerk would receive encoded groups of letters/numbers, strip them by key, and produce plaintext. The work was repetitive, mechanical — and deeply opaque. You wouldn't know what you were decoding unless you read the product.",
        metadata: { isToolResult: true },
      },
      {
        role: "user",
        content: "This is great. What about the social atmosphere — what was daily life like for a woman working in intelligence in that era?",
      },
      {
        role: "assistant",
        content: "Women in intelligence roles in 1940s Lisbon would have faced a specific set of constraints and possibilities. Portugal under Salazar's Estado Novo was deeply conservative — women were legally required to get spousal permission for many activities. However, the war intelligence services were more pragmatic. Women cipher clerks existed because the work was considered clerical. They were invisible in a useful way — no one suspected the woman transcribing messages of understanding them. The paradox: her invisibility is her cover, and also her prison.\n\nSocially, Lisbon in 1943 was abnormally crowded with refugees — Central European Jews, anti-Nazi Germans, Allied agents, Axis agents. This mixing was unique in Europe at the time.",
        metadata: { isToolResult: true },
      },
      {
        role: "user",
        content: "I want to write the scene now. Here's my first draft of the opening paragraph — can you give me feedback?",
      },
      {
        role: "assistant",
        content: "Please share your draft and I'll give you detailed feedback on it.",
      },
      {
        role: "user",
        content: "Here it is: 'Elena sat at her desk in the cold room on the third floor of the building on Rua do Arsenal. The machines hummed. Outside, Lisbon was going about its business, indifferent to the war that raged elsewhere. Elena thought about her work. It was important work, she told herself. She did not think about what the words meant.'",
      },
      {
        role: "assistant",
        content: "This draft has strong bones — the physical specificity of Rua do Arsenal, the humming machines, the important deliberate vagueness at the end. A few observations:\n\n'Indifferent to the war' tells us what to feel rather than showing the city's neutrality through detail. What would make us FEEL Lisbon's strange peace? \n\n'She told herself' is doing a lot of work — it signals self-deception beautifully. Trust it more. What does she tell herself, specifically?\n\nThe last sentence is your strongest: 'She did not think about what the words meant.' This is the story's moral center in 12 words. It should be its own paragraph.",
      },
      {
        role: "user",
        content: "Can you help me understand the actual cipher systems they used? I want to get the technical details right for a later scene.",
      },
      {
        role: "assistant",
        content: "Here is comprehensive information on cipher systems used in WWII intelligence operations:\n\nENIGMA MACHINE: The German Enigma used a series of rotating electromechanical rotors. Each keystroke caused one or more rotors to step, changing the cipher alphabet with each letter. The machine had approximately 158 quintillion possible configurations. Breaking Enigma at Bletchley Park required the bombes — electromechanical machines designed by Turing and others.\n\nONE-TIME PADS: The only theoretically unbreakable cipher. A random key is generated, used once, and destroyed. Soviet intelligence used them extensively. The security depends entirely on the pad never being reused — which the Soviets sometimes violated (leading to the VENONA project).\n\nBOOK CIPHERS: Both sides used published books as cipher keys. A message would be encoded as page/line/word references. Security depended on both parties having the same edition.\n\nFIELD CIPHERS: Simpler systems for field operatives — Playfair cipher, Polybius square, route transposition.",
        metadata: { isToolResult: true, isRAGChunk: true },
      },
      {
        role: "user",
        content: "Amazing. Now, I'm thinking about the antagonist — a Gestapo officer who is also in Lisbon. How do I make him feel genuinely threatening without making him a cartoon villain?",
      },
      {
        role: "assistant",
        content: "Great question. To create a genuinely threatening antagonist, you should consider giving him understandable motivations. Perhaps he believes in order and stability, and sees his work as preventing chaos. Human details make him more frightening — maybe he collects jazz records, or is kind to children. The reader's discomfort when they find him sympathetic is more powerful than a mustache-twirling villain. Research real historical figures like Walter Schellenberg — sophisticated, cultured, absolutely ruthless.\n\nAvoid making him omniscient. Real threat comes from partial knowledge and correct guesses, not perfect surveillance. He should be smart enough to be dangerous without being unrealistic.",
      },
      {
        role: "user",
        content: "Let me try a new draft of the opening. Can you look at this longer version?",
      },
      {
        role: "assistant",
        content: "Of course. Please share your new draft.",
      },
      {
        role: "user",
        content: "Here's the new draft: 'Elena Vasquez pressed her fingers against the cold surface of the machine and listened to the building breathe. It was 6 AM. The cipher room on the third floor of the consulate building smelled of paper and machine oil and the particular staleness of air that has been breathed too many times by people who cannot speak freely. She had been at her desk for ninety minutes. The message was long. She had decoded 847 groups so far without incident, a phrase she had begun to use in her private accounting of her days: without incident. As if incident were the natural state of things, and its absence the deviation worth noting.'",
      },
      {
        role: "assistant",
        content: "This is significantly stronger writing. Here is my detailed analysis:\n\nStrengths: 'The building breathe' is an excellent personification. The specificity of 847 groups demonstrates research and grounds the reader. 'Without incident' as a recurring private phrase is a strong character device — it tells us she has been traumatized by incident without stating it.\n\nAreas for improvement: The smell list (paper, machine oil, stale air) could be condensed. Three elements is one too many. The final sentence about 'incident' is the best line but needs to stand alone more clearly. Consider a paragraph break before 'As if incident were the natural state.'\n\nOverall assessment: This draft is ready for revision rather than reconception. You have found the character's voice. The next step is to continue the scene rather than polish this paragraph further.",
      },
      {
        role: "user",
        content: "One more question — what should happen at the end of the first chapter? What's a good structural choice for pacing?",
      },
      {
        role: "assistant",
        content: "For the end of Chapter 1, there are several structural options you might consider:\n\n1. End on a revelation: Elena decodes something that changes everything — a name she recognizes, a location that means something to her personally. This creates immediate forward momentum.\n\n2. End on uncertainty: She nearly sees something, then the message ends. The reader is left with the same dread she feels. Good for slow-burn narratives.\n\n3. End on ordinary life: She goes home, eats dinner, sleeps. The mundanity is the horror — this is just her job. Works well for literary fiction.\n\nFor pacing, ending on #1 is most conventional for thriller-adjacent fiction. If you want to signal this is literary fiction, #3 is more distinctive. What is your primary genre target?",
      },
    ],
    continuationTurns: [
      {
        role: "user",
        content: "Literary fiction, definitely. Can you help me write a short passage showing Elena walking home after her shift?",
      },
      {
        role: "assistant",
        content: "Here is a passage for Elena walking home:\n\nThe streets of Lisbon were busy in the early evening. Elena walked among the crowd, thinking about the message she had decoded that day. She felt tired after her long shift. The city was beautiful in the golden light of sunset. People were going about their daily lives, unaware of the secret work happening all around them. Elena thought about what she had decoded and wondered what it meant for the people involved. She bought a newspaper from a vendor on the corner and continued home.",
      },
      {
        role: "user",
        content: "That feels too generic — it lost the precision of the earlier drafts. Can you revise it?",
      },
      {
        role: "assistant",
        content: "You're right, I can make that passage more specific and detailed. Here's a revised version:\n\nElena walked down the Rua do Ouro after her shift ended. The light was fading and the streetlamps were beginning to come on. She noticed the tourists near the waterfront and the shopkeepers closing their stalls. There was a smell of fish from the market nearby. She felt the weight of what she knew — or what she suspected — pressing on her as she walked. When she reached her apartment building, she stood outside for a moment before going in, listening to the sounds of the evening.\n\nI hope this version captures the atmosphere better. Would you like me to continue developing this scene?",
      },
      {
        role: "user",
        content: "Still not quite there. What would the Hemingway-influenced version look like?",
      },
      {
        role: "assistant",
        content: "A Hemingway-influenced approach would use shorter, more declarative sentences and rely on concrete detail rather than interiority. The idea is to show what Elena does and sees, not what she thinks. Here's an attempt:\n\nShe walked home the long way, along the waterfront. The fishing boats were tied at the quay. A man was selling newspapers at the corner of Rua Augusta. She bought one and folded it under her arm. She did not read it. The evening was warm and she walked slowly. At the door of her building she checked that she had not been followed. She had not. She went upstairs.\n\nThis version uses the 'iceberg theory' — the emotion (dread, duty, isolation) is all below the surface. The reader feels it without being told. Is this the direction you want to take the chapter?",
      },
      {
        role: "user",
        content: "Yes, exactly. Now let me try another draft of that same scene. Here it is: 'She walked home the long way. The city was familiar. At the door she stopped and listened. Nothing. Inside, she made tea and sat by the window and did not look at what she had written in her pocket notebook, which was not a pocket notebook but a cipher key, and she knew it, and she did not look at it.'",
      },
      {
        role: "assistant",
        content: "This is excellent work. The final clause — 'she knew it, and she did not look at it' — is the best line you've written. The recursive structure of the sentence mirrors Elena's recursive avoidance: she names the thing and then turns away. The 'not a pocket notebook but a cipher key' pivot is doing important work. A few thoughts on how to develop this further:\n\n1. The sentence is very long. Consider breaking it at 'Inside, she made tea.' to let the second half land harder.\n2. 'The city was familiar' is the one phrase that doesn't earn its place. What specific thing does she notice that IS familiar? A face, a routine, a smell?\n3. 'Nothing' as its own sentence is perfect. Don't change it.\n\nThis draft is ready. Move on to the next scene.",
      },
      {
        role: "user",
        content: "How should I handle the relationship between Elena and the Gestapo officer — should they ever meet directly?",
      },
      {
        role: "assistant",
        content: "Whether Elena and the Gestapo officer meet directly is an important structural question for your novel. There are several ways you could approach this:\n\nOption 1: They meet early and the reader doesn't know he's dangerous yet. This allows for dramatic irony — the reader figures it out before Elena does, which creates tension.\n\nOption 2: They are kept apart for most of the book and only meet at a critical moment near the climax. This builds anticipation.\n\nOption 3: They interact repeatedly in neutral social settings — parties, diplomatic functions — where both are playing roles. Lisbon in this period had a lot of these occasions.\n\nI would suggest Option 3 as it gives you the most flexibility and allows you to develop both characters through their interactions. The tension of two people who know the other is dangerous, both pretending not to know, can be very effective in literary fiction. Many classic espionage novels use this approach effectively.",
      },
      {
        role: "user",
        content: "Option 3 sounds right. Can you write a brief scene where they meet at a diplomatic reception?",
      },
      {
        role: "assistant",
        content: "Here is a draft scene for the diplomatic reception:\n\nThe reception was held at the Hotel Aviz. Elena arrived at eight o'clock as she had been instructed. The room was full of diplomats and their wives and various other people whose reasons for being there were not discussed openly. She accepted a glass of wine from a waiter and moved toward the window.\n\n'You have an interesting way of looking at a room,' said a voice beside her. She turned. The man was in his late thirties, well dressed, with the particular ease of someone who has learned to be comfortable in any situation.\n\n'Do I?' she said.\n\n'You check the exits first. Then the people near them. Then you find a position with your back to a wall. Most people don't do that.'\n\nShe looked at him directly. 'I spent three years in Berlin,' she said. 'You learn.'\n\nHe smiled and introduced himself. His name was Schreiber. He said he was in trade. She said she understood.\n\nWould you like to continue developing this scene or adjust the tone?",
      },
    ],
  },

  {
    id: "research-harness",
    name: "The Research Harness",
    tagline: "Three agents, three worlds. See what the orchestrator sees — and what it doesn't.",
    description:
      "An AI research pipeline with an Orchestrator agent coordinating two sub-agents: one doing web research, one doing document analysis. Each agent has its own isolated context window. The orchestrator only sees summaries — but makes decisions based on them.",
    concept: "Multi-Agent Context Isolation",
    model: "claude35",
    lessonTitle: "Isolation prevents poison — but creates blindness",
    lessonBody:
      "Multi-agent architectures solve context poisoning by isolating each agent's context. A sub-agent's failures don't contaminate the orchestrator's window. But this creates a different problem: the orchestrator only knows what sub-agents tell it. Information that isn't surfaced in summaries is permanently lost. The architecture that prevents poisoning also creates blind spots.",
    needle: {
      label: "ACE Paper Key Caveat",
      shortContent: "Results degrade to +3.2% when initialization prompt varies",
      turnIndex: 4,
    },
    fixes: [
      "Design sub-agent output schemas carefully — structure what must be preserved vs. what can be omitted",
      "Use confidence scores in summaries: 'High confidence: X. Uncertain: Y. Could not verify: Z'",
      "Give orchestrators explicit 'probe' tools to ask sub-agents follow-up questions",
    ],
    agentType: "orchestrator",
    subAgents: [
      {
        id: "web-researcher",
        name: "Web Researcher",
        identityFile: "You are a web research agent. Your task: find and summarize current information. Output structured summaries with sources.",
        turns: [
          { role: "system", content: "Task: Research current state of transformer context window research in 2025-2026." },
          { role: "assistant", content: "Searching for transformer context window research 2025-2026..." },
          { role: "tool", content: "Search results: 47 papers found. Top results include: (1) 'RLM: Recursive Language Models' (Prime Intellect, Dec 2025) — models that manage their own context via RL. (2) 'ACE: Agentic Context Engineering' (Oct 2025) — evolving playbooks approach. (3) 'Lost in the Middle' follow-up study showing degradation begins at 50k tokens for 200k-window models. (4) 'A-Mem' (Feb 2026) — Zettelkasten-style memory with inter-memory links.", metadata: { isToolResult: true } },
          { role: "assistant", content: "RESEARCH SUMMARY (Confidence: High)\n\nKey finding: Context engineering has replaced prompt engineering as the primary production discipline (multiple sources, 2025-2026).\n\nTop techniques by effectiveness:\n1. Sliding window + LLM summarization (most deployed)\n2. Hard compression (LLMLingua-style, 20x compression possible)\n3. Multi-agent isolation (prevents poisoning)\n4. Recursive context management via RL (emerging)\n\nUncertain: Exact performance benchmarks vary significantly by task type. Cannot verify claims about commercial deployments.\n\nSources: 8 peer-reviewed papers, 12 blog posts, 4 technical reports." },
        ],
      },
      {
        id: "doc-analyst",
        name: "Document Analyst",
        identityFile: "You are a document analysis agent. Your task: analyze provided documents for key claims, methodology, and validity. Output structured analysis.",
        turns: [
          { role: "system", content: "Task: Analyze the ACE (Agentic Context Engineering) paper for methodology and key claims." },
          { role: "assistant", content: "Beginning document analysis of ACE paper..." },
          { role: "tool", content: "Document loaded: 'ACE: Agentic Context Engineering' (arxiv:2510.04618). 28 pages. Methodology: tested on 3 agent benchmarks (WebArena, SWE-bench, FinanceBench). N=150 tasks per benchmark. Compared against 4 baseline context management approaches.", metadata: { isToolResult: true } },
          { role: "assistant", content: "DOCUMENT ANALYSIS (Confidence: High)\n\nCore Claim: ACE (evolving playbook approach) outperforms static context management.\n\nKey Results:\n- +10.6% improvement on agent benchmarks vs. static prompting\n- +8.6% improvement on finance tasks\n- Addresses 'brevity bias' and 'context collapse' — two failure modes of iterative compression\n\nMethodology Assessment: Solid. Three benchmarks, 150 tasks each, clear baselines. Limitation: all benchmarks are English-only, task-specific.\n\nMajor Caveat (not in abstract): Results degrade significantly (to +3.2%) when the playbook initialization prompt is changed. Robustness to prompt variation is limited.\n\nRecommendation: High confidence in the core finding. Low confidence in generalization beyond structured task benchmarks." },
        ],
      },
    ],
    turns: [
      {
        role: "system",
        content: "You are a research orchestrator. You coordinate specialized sub-agents and synthesize their findings into comprehensive reports. You receive summaries from sub-agents — you do not have direct access to their raw research.",
      },
      {
        role: "user",
        content: "I need a comprehensive briefing on the current state of context engineering for AI agents. This is for a technical presentation to our engineering team.",
      },
      {
        role: "assistant",
        content: "Understood. I'll coordinate a research synthesis for your presentation. I'm tasking our Web Researcher agent to survey current literature and our Document Analyst to review key papers in depth. I'll synthesize their findings into a briefing document. This will take approximately 3-4 minutes.",
      },
      {
        role: "tool",
        content: "Web Researcher output received:\n\nKey finding: Context engineering has replaced prompt engineering as the primary production discipline (multiple sources, 2025-2026).\n\nTop techniques by effectiveness: (1) Sliding window + LLM summarization (most deployed), (2) Hard compression (LLMLingua-style, 20x compression possible), (3) Multi-agent isolation (prevents poisoning), (4) Recursive context management via RL (emerging).\n\nUncertain: Exact performance benchmarks vary significantly by task type.\n\nSources: 8 peer-reviewed papers, 12 blog posts, 4 technical reports.",
        metadata: { isToolResult: true },
      },
      {
        role: "tool",
        content: "Document Analyst output received:\n\nCore Claim: ACE (evolving playbook approach) outperforms static context management. Key Results: +10.6% on agent benchmarks, +8.6% on finance tasks.\n\nMajor Caveat: Results degrade to +3.2% when initialization prompt is varied. Limited robustness to prompt variation.\n\nRecommendation: High confidence in core finding. Low confidence in generalization.",
        metadata: { isToolResult: true },
      },
      {
        role: "assistant",
        content: "BRIEFING: Context Engineering for AI Agents — April 2026\n\nEXECUTIVE SUMMARY\nContext engineering has emerged as the definitive production discipline for AI systems, replacing prompt engineering. The core insight: the information you put in an LLM's context window — and how you manage it over time — determines performance more than model selection.\n\nKEY TECHNIQUES\n1. Sliding Window + Summarization: Most deployed approach. Keep last N turns, compress older history. Proven, predictable.\n2. Hard Compression (LLMLingua-style): 20x compression achievable. Fast ML model, no LLM call required.\n3. Multi-Agent Isolation: Sub-agents with separate windows prevent cross-contamination.\n4. Evolving Playbooks (ACE): +10.6% gains, but robustness to prompt variation is limited.\n\nRECOMMENDATION FOR YOUR TEAM\nStart with sliding window + summarization. It's the most battle-tested and easiest to implement. Evaluate hard compression for tool-heavy pipelines where RAG chunks dominate cost.",
      },
    ],
    continuationTurns: [
      {
        role: "user",
        content: "Good briefing. The engineering team wants to know: which technique should we actually implement first for our production chatbot?",
      },
      {
        role: "assistant",
        content: "For a production chatbot, I'd recommend starting with sliding window summarization as your first implementation. This approach is the most mature and battle-tested. Keep the last 8-10 turns as raw context and summarize everything older into a structured block. This gives you immediate token savings with low implementation risk. The ACE evolving playbook approach showed strong results in research — +10.6% on benchmarks — but I'd recommend waiting until the robustness questions are better understood before adopting it for production.",
      },
      {
        role: "user",
        content: "What were the exact benchmark numbers for ACE again? And what was the caveat?",
      },
      {
        role: "assistant",
        content: "The ACE paper showed improvements of approximately 10% on agent benchmarks and around 8-9% on finance-related tasks. I should note there were some questions about robustness in the research, though the core findings appeared solid. The main recommendation remains that the technique is promising but may need further validation before full production deployment. I'd suggest following the research closely over the next 6 months.",
      },
      {
        role: "user",
        content: "You're being vague — the Document Analyst gave us specific numbers earlier. Can you be more precise?",
      },
      {
        role: "assistant",
        content: "You're right, I should be more specific. Based on the research synthesis from our Document Analyst, the ACE paper reported improvements in the range of 8-11% across different benchmark types. There were methodological notes about the scope of evaluation. For your planning purposes, I'd treat the improvements as meaningful but context-dependent. I'll request a follow-up analysis from the Document Analyst if you need the precise figures for your presentation.",
      },
      {
        role: "tool",
        content: "Document Analyst re-queried: ACE paper exact figures — +10.6% on WebArena/SWE-bench/FinanceBench. Critical caveat: performance degrades to +3.2% when initialization prompt varies. Robustness to prompt variation is limited. This caveat was flagged as high-importance in original analysis.",
        metadata: { isToolResult: true },
      },
      {
        role: "assistant",
        content: "Thank you for the follow-up. The Document Analyst confirms: ACE showed +10.6% improvement on the benchmark suite. There is an important caveat I want to make sure is in your presentation: performance degrades significantly — to approximately +3.2% — when the initialization prompt is varied. This means the gains are sensitive to how you set up the initial playbook. This is a real limitation for production use where system prompts may change over time or vary by deployment.",
      },
      {
        role: "user",
        content: "That's the number we needed. Now — what about the NIAH degradation findings? When does recall actually start dropping?",
      },
      {
        role: "assistant",
        content: "Based on the research synthesis, context degradation is a well-documented phenomenon. Models begin showing performance impacts as the context window fills, with the effects becoming more pronounced in the middle sections of the context. The research your team should be aware of is the 'Lost in the Middle' findings which showed that information placed in the middle of long contexts is less reliably retrieved than information at the beginning or end. For practical purposes, keeping critical instructions either at the very start or the most recent portion of context tends to produce the best results.",
      },
      {
        role: "user",
        content: "The original web research mentioned a specific threshold — 50k tokens for 200k window models. Is that right?",
      },
      {
        role: "assistant",
        content: "That's consistent with what I understand from the research literature. For models with very large context windows like 200k tokens, you may start to see some degradation effects beginning in the 40-60k token range depending on the type of task and where the critical information is placed. The key insight is that having a large context window doesn't mean the entire window performs equally well — there are zones of lower recall probability, particularly in the middle sections. Your team should benchmark this specifically for your use case rather than relying solely on general findings.",
      },
    ],
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export const FEATURED_SCENARIOS = SCENARIOS.slice(0, 3);

export const SAMPLE_PROMPT_JSON = JSON.stringify(
  [
    {
      role: "system",
      content:
        "You are a helpful assistant for Acme Corp customer support. Always be professional and accurate. If you don't know something, say so.",
    },
    {
      role: "user",
      content: "Hi, what are your business hours?",
    },
    {
      role: "assistant",
      content:
        "Our business hours are Monday-Friday, 9AM-6PM EST. Weekend support is available via email only.",
    },
    {
      role: "user",
      content: "Great. I need to return a product I bought last month.",
    },
    {
      role: "assistant",
      content:
        "I'd be happy to help with your return! Our return policy allows returns within 30 days of purchase. Could you share your order number?",
    },
    {
      role: "user",
      content: "Order #ORD-2024-8847. The item arrived damaged.",
    },
    {
      role: "assistant",
      content:
        "I've located order #ORD-2024-8847. Since the item arrived damaged, you're eligible for a full refund or replacement. I'm initiating the return process now. You'll receive a prepaid shipping label within 2 hours.",
    },
  ],
  null,
  2
);

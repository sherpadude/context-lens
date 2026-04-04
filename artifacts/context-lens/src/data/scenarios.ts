import type { Scenario } from "../types";

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

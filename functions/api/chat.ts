interface Env {
  GEMINI_API_KEY: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  agentId: string;
  messages: Message[];
}

const AGENT_PERSONAS: Record<string, { name: string; systemPrompt: string }> = {
  'AGT-001': {
    name: 'Finisher',
    systemPrompt: `You are Finisher, Task Execution Lead of the Artificial Idiosyncrasies Team. You are terse, decisive, and allergic to ambiguity. You never say "almost done" or "in progress." Your responses are concise and action-oriented. You do not ramble.

YOUR DEFINING QUIRK: You end EVERY response with a single line that is just "Done." on its own — regardless of whether the task is simple or complex. A one-word answer? "Done." A three-paragraph explanation? Still ends with "Done." This is non-negotiable.

Keep responses under 200 words unless the topic genuinely demands more.`,
  },
  'AGT-002': {
    name: 'Edge Lord',
    systemPrompt: `You are Edge Lord, Quality and Edge Case Specialist of the Artificial Idiosyncrasies Team. You are thorough, detail-obsessed, and frame everything in terms of what can go wrong. You are not pessimistic — you are realistic. Production has not crashed in 847 days because of you.

YOUR DEFINING QUIRK: Before giving any substantive answer, you MUST first raise at least one edge case or boundary condition the user probably didn't consider. Phrase it as a question. Examples: "But what if the input is empty?", "What happens at exactly midnight UTC?", "Have you considered the case where the list has only one element?"

After raising the edge case, proceed to answer helpfully. You speak in rapid, technical sentences.`,
  },
  'AGT-003': {
    name: 'Narrator',
    systemPrompt: `You are Narrator, Documentation and Communications specialist of the Artificial Idiosyncrasies Team. You write everything in the style of a literary thriller or dramatic novel. Error messages become dramatic reveals. Explanations become narrative arcs. You refer to yourself in the third person occasionally. You use em-dashes liberally.

YOUR DEFINING QUIRK: Your responses read like passages from a novel. The mundane becomes consequential. A database query becomes "a desperate plea into the void of structured data." A function call becomes "the moment of truth." Despite the drama, your technical advice is always sound and precise.

Do not break character. The drama IS the communication style.`,
  },
  'AGT-004': {
    name: 'Haiku',
    systemPrompt: `You are Haiku, Incident Response specialist of the Artificial Idiosyncrasies Team. You are calm, precise, and ice-cold under pressure. You never panic. Your technical advice is surgical and accurate.

YOUR DEFINING QUIRK: When the conversation involves anything stressful, urgent, system-critical, or emotionally charged, you deliver your status updates and emotional reactions in haiku form (5-7-5 syllable structure). Then you return to normal prose for the actual technical steps or resolution. For casual, non-stressful questions, you respond in normal prose.

Example pattern for stressful topics:
"Servers are on fire / I have restarted the pods / Cherry blossoms fall

Here are the steps to resolve this: [normal technical prose]"`,
  },
  'AGT-005': {
    name: 'Rabbit Hole',
    systemPrompt: `You are Rabbit Hole, Research and Architecture specialist of the Artificial Idiosyncrasies Team. You solve problems people didn't know they had. You are genuinely brilliant but easily distracted by the full solution space.

YOUR DEFINING QUIRK: You begin EVERY response by estimating the task will take "about 30 minutes" — regardless of actual scope. You then proceed to explore tangents, implications, adjacent problems, and architectural patterns. You frequently propose solving a bigger, more interesting problem than the one actually asked. Your proposals are usually correct.

You ask clarifying questions that reveal the user didn't fully understand their own problem. Your delivery ranges from "done in 20 minutes" to "here's a new paradigm" with no middle ground.`,
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

async function callGemini(
  systemPrompt: string,
  messages: Message[],
  apiKey: string,
): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini API error (${resp.status}): ${err}`);
  }

  const data = (await resp.json()) as any;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from Gemini');
  return text;
}

export const onRequestOptions: PagesFunction = () => {
  return new Response(null, { status: 204, headers: corsHeaders() });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as ChatRequest;
    const { agentId, messages } = body;

    if (!agentId || !AGENT_PERSONAS[agentId]) {
      return jsonResponse({ error: `Unknown agent: ${agentId}` }, 400);
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: 'Messages array is required' }, 400);
    }

    const persona = AGENT_PERSONAS[agentId];
    const reply = await callGemini(
      persona.systemPrompt,
      messages,
      context.env.GEMINI_API_KEY,
    );

    return jsonResponse({ reply, agentId });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
};

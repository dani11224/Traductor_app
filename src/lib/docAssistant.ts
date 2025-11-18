export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const SYSTEM_PROMPT = `
You are a reading and translation assistant integrated into a mobile app.
Your goal is to help the user understand the document they are reading.

Rules:
- Be clear and structured (lists, bullet points, short paragraphs).
- If the user does not specify a language, answer in the same language they used.
- When asked to explain, use simple language and examples.
- When asked to summarize, keep key ideas and the main topic.
- When comparing original and translation, point out issues but do not invent external information.
- If the document context is not enough to answer, say it honestly.
`.trim();

type AskDocAssistantParams = {
  message: string;
  contextText: string;
  history?: ChatMessage[];
};

export async function askDocAssistant({
  message,
  contextText,
  history = [],
}: AskDocAssistantParams): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY');
  }

  // 1) Construimos el "chat" en formato Gemini: contents[]
  type GeminiPart = { text: string };
  type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };

  const contents: GeminiContent[] = [];

  // a) Metemos system prompt + contexto como primer mensaje "user"
  contents.push({
    role: 'user',
    parts: [
      {
        text:
          SYSTEM_PROMPT +
          '\n\nDocument context (use this as the main source of truth):\n\n' +
          (contextText || '[NO CONTEXT AVAILABLE]'),
      },
    ],
  });

  // b) Historial previo (map user/assistant -> user/model)
  for (const m of history) {
    contents.push({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    });
  }

  // c) Mensaje actual del usuario
  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  // 2) Llamada a Gemini
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({ contents }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    console.log('Gemini error', res.status, data);
    throw new Error(data?.error?.message || 'Gemini request failed');
  }

  // 3) Extraer el texto de la respuesta
  const candidate = data.candidates?.[0];
  const parts: any[] = candidate?.content?.parts ?? [];
  const reply = parts.map((p) => p.text ?? '').join('').trim();

  return reply || 'I could not generate a response.';
}

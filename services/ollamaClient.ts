export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

interface OllamaChatResponse {
  message?: {
    role?: string;
    content?: string;
  };
}

const readEnv = (name: string): string | undefined => {
  const processEnv = (globalThis as any)?.process?.env as Record<string, string | undefined> | undefined;
  const viteEnv = (import.meta as any)?.env as Record<string, string | undefined> | undefined;
  return processEnv?.[name] ?? viteEnv?.[`VITE_${name}`];
};

export const getOllamaBaseUrl = (): string =>
  (readEnv('OLLAMA_BASE_URL') || 'http://127.0.0.1:11434').replace(/\/+$/, '');

export const getOllamaModel = (): string =>
  readEnv('OLLAMA_MODEL') || 'qwen2.5:7b-instruct';

export const getOllamaVisionModel = (): string =>
  readEnv('OLLAMA_VISION_MODEL') || 'llava:latest';

const safeJsonParse = <T>(raw: string): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(raw.slice(firstBrace, lastBrace + 1)) as T;
    }
    throw new Error('模型返回的 JSON 无法解析');
  }
};

export const ollamaChat = async (
  messages: OllamaMessage[],
  options?: {
    model?: string;
    temperature?: number;
    numCtx?: number;
    format?: 'json';
  }
): Promise<string> => {
  const resp = await fetch(`${getOllamaBaseUrl()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options?.model || getOllamaModel(),
      stream: false,
      messages,
      format: options?.format,
      options: {
        temperature: options?.temperature ?? 0.7,
        num_ctx: options?.numCtx ?? 8192,
      },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Ollama API 错误 (${resp.status}): ${body}`);
  }

  const data = (await resp.json()) as OllamaChatResponse;
  const text = data.message?.content?.trim();
  if (!text) throw new Error('Ollama 未返回有效内容');
  return text;
};

export const ollamaChatJson = async <T>(
  messages: OllamaMessage[],
  options?: {
    model?: string;
    temperature?: number;
    numCtx?: number;
  }
): Promise<T> => {
  const text = await ollamaChat(messages, { ...options, format: 'json' });
  return safeJsonParse<T>(text);
};

export const checkOllamaHealth = async (): Promise<boolean> => {
  try {
    const resp = await fetch(`${getOllamaBaseUrl()}/api/tags`, { method: 'GET' });
    return resp.ok;
  } catch {
    return false;
  }
};

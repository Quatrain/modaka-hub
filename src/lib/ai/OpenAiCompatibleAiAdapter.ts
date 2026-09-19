import { AbstractAiAdapter } from '@quatrain/ai';

export interface OpenAiCompatibleConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

/**
 * Universal AI Adapter for OpenAI-compatible REST APIs
 * (DeepSeek V3/R1, Qwen 2.5 via DashScope/OpenRouter/Ollama, OpenAI, Groq, etc.)
 */
export class OpenAiCompatibleAiAdapter extends AbstractAiAdapter {
  protected apiKey: string;
  protected baseUrl: string;
  protected defaultModel: string;

  constructor(config: OpenAiCompatibleConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.defaultModel = config.defaultModel || 'gpt-4o';
  }

  init(): void {
    // Stateless HTTP client using native fetch
  }

  /**
   * Normalizes various prompt representations into OpenAI chat completion messages.
   */
  protected normalizeMessages(prompt: any, systemInstruction?: string): any[] {
    const messages: any[] = [];

    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }

    if (typeof prompt === 'string') {
      messages.push({ role: 'user', content: prompt });
      return messages;
    }

    if (Array.isArray(prompt)) {
      const userParts: any[] = [];

      for (const part of prompt) {
        if (!part) continue;
        if (typeof part === 'string') {
          userParts.push({ type: 'text', text: part });
        } else if (part.role && part.content) {
          messages.push(part);
        } else if (part.text) {
          userParts.push({ type: 'text', text: part.text });
        } else if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/jpeg';
          userParts.push({
            type: 'image_url',
            image_url: {
              url: `data:${mime};base64,${part.inlineData.data}`
            }
          });
        }
      }

      if (userParts.length > 0) {
        // If all parts are text, collapse to string content for maximum compatibility
        const allText = userParts.every((p) => p.type === 'text');
        if (allText) {
          messages.push({
            role: 'user',
            content: userParts.map((p) => p.text).join('\n\n')
          });
        } else {
          messages.push({
            role: 'user',
            content: userParts
          });
        }
      }

      return messages;
    }

    messages.push({ role: 'user', content: String(prompt) });
    return messages;
  }

  /**
   * Generates plain text from prompt
   */
  async generateText(prompt: string, options?: any): Promise<string> {
    const model = options?.model || this.defaultModel;
    const messages = this.normalizeMessages(prompt, options?.systemPrompt);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI-compatible API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Generates structured JSON matching schema
   */
  async generateStructured(prompt: any, schema: any, options?: any): Promise<any> {
    const model = options?.model || this.defaultModel;
    const systemPrompt = `You are a precision AI structured data extractor. You must respond strictly with a valid JSON object matching this schema:\n${JSON.stringify(schema, null, 2)}\nDo not include code markdown blocks or explanations.`;

    const messages = this.normalizeMessages(prompt, systemPrompt);

    const requestBody: any = {
      model,
      messages,
      temperature: options?.temperature ?? 0.1,
      response_format: { type: 'json_object' }
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI-compatible structured API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      throw new Error('No content returned from AI model');
    }

    // Strip markdown formatting if any was returned despite instructions
    const cleaned = content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (parseErr: any) {
      throw new Error(`Failed to parse structured JSON from model: ${parseErr.message}\nRaw content: ${content}`);
    }
  }

  /**
   * Generates streaming text chunks
   */
  async generateTextStream(prompt: string, options?: any): Promise<AsyncIterable<string>> {
    const model = options?.model || this.defaultModel;
    const messages = this.normalizeMessages(prompt, options?.systemPrompt);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.3,
        stream: true
      })
    });

    if (!response.ok || !response.body) {
      const errText = await response.text();
      throw new Error(`OpenAI-compatible streaming error (${response.status}): ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    async function* makeGenerator() {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.substring(6);
          if (dataStr === '[DONE]') return;

          try {
            const parsed = JSON.parse(dataStr);
            const textChunk = parsed.choices?.[0]?.delta?.content;
            if (textChunk) {
              yield textChunk;
            }
          } catch {
            // ignore malformed SSE chunks
          }
        }
      }
    }

    return makeGenerator();
  }
}

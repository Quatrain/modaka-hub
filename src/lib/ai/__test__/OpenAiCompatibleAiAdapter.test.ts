import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAiCompatibleAiAdapter } from '../OpenAiCompatibleAiAdapter';

describe('OpenAiCompatibleAiAdapter', () => {
  const adapter = new OpenAiCompatibleAiAdapter({
    apiKey: 'mock-key',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat'
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates text using chat completion endpoint', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: 'DeepSeek response text'
          }
        }
      ]
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as any);

    const result = await adapter.generateText('Explain photosynthesis', { model: 'deepseek-chat' });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.deepseek.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-key'
        })
      })
    );
    expect(result).toBe('DeepSeek response text');
  });

  it('generates structured JSON conforming to schema', async () => {
    const structuredPayload = {
      title: 'Guide viticole',
      category: 'viticulture',
      tags: ['bio', 'sol']
    };

    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify(structuredPayload)
          }
        }
      ]
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as any);

    const schema = {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        category: { type: 'STRING' },
        tags: { type: 'ARRAY', items: { type: 'STRING' } }
      }
    };

    const result = await adapter.generateStructured('Extract metadata', schema);
    expect(result).toEqual(structuredPayload);
  });

  it('parses structured JSON even if model wraps in markdown backticks', async () => {
    const structuredPayload = {
      summary: 'Clean summary from Qwen model'
    };

    const mockResponse = {
      choices: [
        {
          message: {
            content: '```json\n' + JSON.stringify(structuredPayload) + '\n```'
          }
        }
      ]
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as any);

    const result = await adapter.generateStructured('Extract summary', {});
    expect(result).toEqual(structuredPayload);
  });

  it('throws helpful error on API failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Invalid API key'
    } as any);

    await expect(adapter.generateText('Test')).rejects.toThrow(/401.*Invalid API key/);
  });
});

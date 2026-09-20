import { OpenAiAdapter, type OpenAiAdapterConfig } from '@quatrain/ai-openai';

export type OpenAiCompatibleConfig = OpenAiAdapterConfig;

/**
 * Universal AI Adapter for OpenAI-compatible REST APIs
 * (DeepSeek V3/R1, Qwen 2.5 via DashScope/OpenRouter/Ollama, OpenAI, Groq, etc.)
 *
 * Inherits directly from `@quatrain/ai-openai`'s canonical `OpenAiAdapter`.
 */
export class OpenAiCompatibleAiAdapter extends OpenAiAdapter {}

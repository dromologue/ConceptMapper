import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaLLMClient, createLLMClient, BridgeLLMClient } from '../llm/client';
import type { LLMConfig, LLMRequest } from '../types/llm';

const ollamaConfig: LLMConfig = {
  provider: 'ollama',
  model: 'llama3',
  baseUrl: 'http://localhost:11434',
  temperature: 0.5,
};

const sampleRequest: LLMRequest = {
  requestId: 'req-1',
  systemPrompt: 'You are a helpful assistant.',
  messages: [
    { role: 'user', content: 'Hello', timestamp: Date.now() },
  ],
};

describe('OllamaLLMClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends correct request to Ollama endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: { content: 'Hi there!' } }),
    });

    const client = new OllamaLLMClient();
    const result = await client.sendMessage(ollamaConfig, sampleRequest);

    expect(result).toBe('Hi there!');
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:11434/api/chat');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.model).toBe('llama3');
    expect(body.stream).toBe(false);
    expect(body.options.temperature).toBe(0.5);
    expect(body.messages).toEqual([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' },
    ]);
  });

  it('uses default endpoint when baseUrl is not set', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: { content: 'ok' } }),
    });

    const configNoUrl: LLMConfig = { provider: 'ollama', model: 'llama3' };
    const client = new OllamaLLMClient();
    await client.sendMessage(configNoUrl, sampleRequest);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:11434/api/chat');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const client = new OllamaLLMClient();
    await expect(client.sendMessage(ollamaConfig, sampleRequest)).rejects.toThrow('Ollama error: HTTP 500');
  });

  it('returns empty string when message content is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const client = new OllamaLLMClient();
    const result = await client.sendMessage(ollamaConfig, sampleRequest);
    expect(result).toBe('');
  });
});

describe('createLLMClient', () => {
  const mockSendToSwift = vi.fn();

  it('returns BridgeLLMClient for native app', () => {
    const client = createLLMClient(true, 'anthropic', mockSendToSwift);
    expect(client).toBeInstanceOf(BridgeLLMClient);
  });

  it('returns OllamaLLMClient for ollama provider in browser', () => {
    const client = createLLMClient(false, 'ollama', mockSendToSwift);
    expect(client).toBeInstanceOf(OllamaLLMClient);
  });

  it('returns unsupported client for other providers in browser', async () => {
    const client = createLLMClient(false, 'anthropic', mockSendToSwift);
    await expect(client.sendMessage(ollamaConfig, sampleRequest)).rejects.toThrow(
      'Browser mode only supports Ollama'
    );
  });
});

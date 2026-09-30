import { loadConfig } from '../config';
import { logger } from '../logger';
import { logLlmCall } from './audit';

export class OllamaUnavailableError extends Error {
  constructor(cause: unknown) {
    super(
      `Ollama unavailable: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = 'OllamaUnavailableError';
  }
}

export class OllamaTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Ollama did not respond within ${timeoutMs}ms`);
    this.name = 'OllamaTimeoutError';
  }
}

export class OllamaHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Ollama HTTP ${status}: ${body.slice(0, 200)}`);
    this.name = 'OllamaHttpError';
  }
}

export interface OllamaGenerateOptions {
  prompt: string;
  promptVersion: string;
  timeoutMs?: number;
}

export interface OllamaGenerateResult {
  rawResponse: string;
  durationMs: number;
  model: string;
}

interface OllamaApiResponse {
  response: string;
  done: boolean;
}

const DEFAULT_TIMEOUT_MS = 180_000;
// Mantener el modelo cargado en memoria entre llamadas para evitar cold-loads
// (el default de Ollama son 5min y con 7B tarda ~30-90s en recargarse).
const KEEP_ALIVE = '1h';

export async function generateJson(
  opts: OllamaGenerateOptions,
): Promise<OllamaGenerateResult> {
  return generate(opts, 'json');
}

export async function generateText(
  opts: OllamaGenerateOptions,
): Promise<OllamaGenerateResult> {
  return generate(opts, undefined);
}

async function generate(
  opts: OllamaGenerateOptions,
  format: 'json' | undefined,
): Promise<OllamaGenerateResult> {
  const config = loadConfig();
  const url = `${config.OLLAMA_HOST.replace(/\/$/, '')}/api/generate`;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const started = Date.now();
  let rawResponse = '';
  let finalError: string | undefined;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.OLLAMA_MODEL,
        prompt: opts.prompt,
        ...(format ? { format } : {}),
        stream: false,
        keep_alive: KEEP_ALIVE,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new OllamaHttpError(res.status, body);
    }

    const data = (await res.json()) as OllamaApiResponse;
    rawResponse = data.response ?? '';
    const durationMs = Date.now() - started;

    logLlmCall({
      ts: new Date().toISOString(),
      model: config.OLLAMA_MODEL,
      prompt_version: opts.promptVersion,
      duration_ms: durationMs,
      prompt: opts.prompt,
      raw_response: rawResponse,
      parsed_ok: true,
    });

    return { rawResponse, durationMs, model: config.OLLAMA_MODEL };
  } catch (err) {
    finalError = err instanceof Error ? err.message : String(err);
    logLlmCall({
      ts: new Date().toISOString(),
      model: config.OLLAMA_MODEL,
      prompt_version: opts.promptVersion,
      duration_ms: Date.now() - started,
      prompt: opts.prompt,
      raw_response: rawResponse,
      parsed_ok: false,
      error: finalError,
    });

    // Aborted por nuestro AbortController → timeout explícito.
    if (err instanceof Error && err.name === 'AbortError') {
      throw new OllamaTimeoutError(timeoutMs);
    }
    // Errores HTTP: pasan derecho; el caller decide cómo tratarlos.
    if (err instanceof OllamaHttpError) {
      logger.error(
        { status: err.status, body: err.body.slice(0, 500) },
        'Ollama returned non-2xx',
      );
      throw err;
    }
    // Errores de red (connection refused, DNS, etc.) → Ollama caído.
    if (isConnectionError(err)) {
      throw new OllamaUnavailableError(err);
    }
    logger.error({ err }, 'Ollama generate failed');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function isConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('econnrefused') ||
    msg.includes('fetch failed') ||
    msg.includes('enotfound') ||
    msg.includes('econnreset')
  );
}

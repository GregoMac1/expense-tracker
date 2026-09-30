import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const LOG_PATH = join(process.cwd(), 'logs', 'llm.jsonl');
let initialized = false;

function ensureDir(): void {
  if (initialized) return;
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  initialized = true;
}

export interface LlmAuditEntry {
  ts: string;
  model: string;
  prompt_version: string;
  duration_ms: number;
  prompt: string;
  raw_response: string;
  parsed_ok: boolean;
  error?: string;
}

export function logLlmCall(entry: LlmAuditEntry): void {
  ensureDir();
  appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
}

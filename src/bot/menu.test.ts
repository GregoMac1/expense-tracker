import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MENU_COMMANDS } from './menu';

const routerSource = readFileSync(join(__dirname, 'router.ts'), 'utf8');

describe('MENU_COMMANDS', () => {
  it.each(MENU_COMMANDS)('/$command cumple el formato de Telegram', ({ command, description }) => {
    expect(command).toMatch(/^[a-z0-9_]{1,32}$/);
    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThanOrEqual(256);
  });

  it.each(MENU_COMMANDS)('/$command está manejado por el router', ({ command }) => {
    expect(routerSource).toContain(`case '/${command}':`);
  });
});

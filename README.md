# expense-tracker

Tracker de gastos personal con bot de Telegram + LLM local (Ollama).

## Setup

1. **Node 20+** (probado con Node 24).
2. **Crear un bot** con [@BotFather](https://t.me/BotFather) y copiar el token.
3. **Conseguir tu user id** de Telegram (mandale `/start` a [@userinfobot](https://t.me/userinfobot)).
4. **Instalar deps**:
   ```bash
   npm install
   ```
5. **Configurar env**:
   ```bash
   cp .env.example .env
   # editar .env con el token del bot y tu user id
   ```
6. **Correr**:
   ```bash
   npm start          # una vez
   npm run dev        # con hot reload
   ```

## Scripts

- `npm start` — arranca el bot.
- `npm run dev` — arranca con watch mode (`tsx watch`).
- `npm run typecheck` — valida tipos sin compilar.
- `npm test` — corre los tests de vitest.

## Estructura

```
src/
├── index.ts          # entrypoint
├── config/           # carga + valida .env con zod
├── logger.ts         # pino
├── db/               # sqlite, migrations, repos
├── bot/              # telegram bot y comandos
├── llm/              # (fase 3) cliente de ollama
├── services/         # (fases 2+) orquestación
├── domain/           # (fases 2+) funciones puras
└── processor/        # (fase 2+) pipeline de procesamiento
```

## Estado

- [x] Fase 1 — Esqueleto (bot con echo, DB + schema, `/ultimos` dummy)
- [x] Fase 2 — LLM + categorización (Ollama, schemas, storage real)
- [x] Fase 3 — Integración con Ollama (mergeada con Fase 2)
- [x] Fase 4 — Personas y deudas (auto-resolve + /fusionar)
- [x] Fase 5 — Cotización del dólar (MEP con caché 1h)
- [x] Fase 6 — Análisis (`/analisis` con LLM sobre stats JS)
- [x] Fase 7 — Pulido (`/editar`, `/exportar`)

## Instalación de Ollama

```bash
# Mac
brew install ollama
ollama serve &                  # corre en background
ollama pull llama3.2:3b         # ~2GB
# o para más precisión: ollama pull qwen2.5:7b  (~4.5GB)
```

## Prerequisitos en runtime

- Ollama corriendo en `localhost:11434` (configurable via `OLLAMA_HOST`)
- Conexión a internet para la cotización del dólar (falla graceful si no)
- Telegram bot token + tu user id

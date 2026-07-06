# Tes Live Agent

Folder ini mendokumentasikan suite tes end-to-end live.

## Tujuan

Menjalankan agent dengan provider LLM nyata (Gemini/OpenAI/xAI), sambil mengejek implementasi tool dan panggilan API eksternal.

Ini memvalidasi:

- Logika pemilihan tool oleh model
- Eksekusi multi-tool dalam satu run
- Perilaku routing yang sadar riwayat
- Path eksekusi middleware agent + LangGraph

## Suite

- Tes live WhatsApp agent:
  - `apps/whatsapp-agent/_TESTS_/live-agent/whatsapp-agent.live.e2e.test.ts`
- Tes live onboarding agent backend:
  - `apps/backend/_TESTS_/live-agent/onboarding-agent.live.e2e.test.ts`

## Menjalankan

Aktifkan tes live secara eksplisit:

```bash
AGENT_LIVE_TESTS=true pnpm test:agents:live
```

Atau jalankan salah satu sisi:

```bash
AGENT_LIVE_TESTS=true pnpm --filter whatsapp-agent test:agent:live
AGENT_LIVE_TESTS=true pnpm --filter backend test:agent:live
```

## Tracing

Tracing LangSmith diaktifkan saat:

- `AGENT_LIVE_TESTS=true`
- `LANGSMITH_TRACING=true` (atau diabaikan dan diaktifkan otomatis dalam setup tes)
- `LANGSMITH_API_KEY` tersedia

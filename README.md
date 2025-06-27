# trash-bot-ai

WhatsApp bot AI in italiano, risponde vocalmente via GPT‑3.5 + TTS.

## Deploy

1. Imposta `OPENAI_API_KEY` in env.
2. `docker build -t trash-bot-ai .`
3. `docker run -p 3000:3000 -e OPENAI_API_KEY=… trash-bot-ai`
4. Avvia con `/start` e scansiona il QR code.

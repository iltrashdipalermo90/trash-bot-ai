
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import express from 'express';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import googleTTS from 'google-tts-api';
import ffmpeg from 'fluent-ffmpeg';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const logger = pino({ level: 'silent' });
const SESSION_DIR = './auth_info', TMP_DIR = './tmp';
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR);
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);
const disabled = new Set();

async function askGPT(msg) {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: 'Rispondi sempre in italiano.' }, { role: 'user', content: msg }]
    });
    return res.choices[0].message.content.trim();
  } catch (e) {
    console.error(e);
    return 'Errore GPT';
  }
}

async function ttsOpus(text) {
  const url = googleTTS.getAudioUrl(text, { lang: 'it', slow: false });
  const mp3 = `${TMP_DIR}/v.mp3`, opus = `${TMP_DIR}/v.opus`;
  execSync(`curl -s -o ${mp3} "${url}"`);
  await new Promise((r, j) => ffmpeg(mp3).audioCodec('libopus').format('opus').save(opus).on('end', r).on('error', j));
  return opus;
}

async function startSession(id = 'default') {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(SESSION_DIR, id));
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['TrashBot', 'Chrome', '1.0']
  });

  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode("18033035111");
    console.log("ðŸ”‘ Pairing Code:", code);
  }

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close' && (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut)) {
      startSession(id);
    }
    if (connection === 'open') {
      console.log("âœ… Bot connesso a WhatsApp!");
    }
  });

  sock.ev.on('messages.upsert', async evt => {
    const msg = evt.messages?.[0];
    if (!msg?.message) return;
    const jid = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!text || msg.key.fromMe) return;
    console.log(`[${jid}] ${text}`);
    if (text === '!stop') {
      disabled.add(jid);
      return sock.sendMessage(jid, { text: 'Bot off' });
    }
    if (text === '!start') {
      disabled.delete(jid);
      return sock.sendMessage(jid, { text: 'Bot on' });
    }
    if (disabled.has(jid)) return;
    const r = await askGPT(text);
    const file = await ttsOpus(r);
    sock.sendMessage(jid, { audio: fs.readFileSync(file), mimetype: 'audio/ogg; codecs=opus', ptt: true });
  });
}

const app = express();
app.use(express.json());
app.post('/start', (req, res) => {
  startSession(req.body.sessionId || 'default')
    .then(() => res.send({ status: 'ok' }))
    .catch(e => res.status(500).send({ error: e.message }));
});
app.get('/', (_, res) => res.send('Bot attivo'));
app.listen(process.env.PORT || 3000, () => console.log('Server on'));

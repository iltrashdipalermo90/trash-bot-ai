const {
  default: makeWASocket,
  makeWALegacySocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  useSingleFileAuthState,
  DisconnectReason,
  generateWAMessageFromContent,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersionOrExit,
  jidNormalizedUser,
  makeWASocket as makeWAPairingSocket,
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const readline = require('readline');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');

const askGPT = require('./lib/ai');

const SESSION_FOLDER = './session';

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWAPairingSocket({
    version,
    printQRInTerminal: false,
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['TrashBot', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  // ✅ Mostra Pairing Code
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr, isNewLogin, pairingCode } = update;

    if (update.pairingCode) {
      console.log(`🔑 Pairing code (inseriscilo su WhatsApp Web):\n\n${update.pairingCode}\n`);
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log('❌ Disconnesso. Devi rifare il pairing.');
        process.exit();
      } else {
        console.log('🔁 Riconnessione...');
        startBot();
      }
    } else if (connection === 'open') {
      console.log('✅ Connesso a WhatsApp con successo!');
    }
  });

  // 📩 Gestione messaggi
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const sender = msg.key.remoteJid;

    if (text.startsWith('.ai ')) {
      const prompt = text.slice(4).trim();
      const reply = await askGPT(prompt);
      await sock.sendMessage(sender, { text: reply }, { quoted: msg });
    }

    if (text === '.ping') {
      await sock.sendMessage(sender, { text: '🏓 Pong!' }, { quoted: msg });
    }
  });
}

startBot();

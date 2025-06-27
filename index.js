const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const pino = require('pino');
const askGPT = require('./lib/ai'); // Assicurati che lib/ai.js esista
require('dotenv').config();

// Avvio
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['TrashBot', 'Chrome', '1.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, pairingCode } = update;

    if (pairingCode) {
      console.log(`\n🔑 Inserisci questo codice su WhatsApp Web: ${pairingCode}\n`);
    }

    if (connection === 'open') {
      console.log('✅ Bot connesso a WhatsApp!');
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log('❌ Disconnesso. Elimina la cartella session/ e riconnetti.');
        process.exit();
      } else {
        console.log('🔁 Tentativo di riconnessione...');
        startBot();
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const sender = msg.key.remoteJid;

    // 🧠 Comando AI
    if (text.startsWith('.ai ')) {
      const prompt = text.slice(4).trim();
      try {
        const reply = await askGPT(prompt);
        await sock.sendMessage(sender, { text: reply }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(sender, { text: '⚠️ Errore durante la risposta AI.' }, { quoted: msg });
      }
    }

    // 📶 Ping con tempo di risposta
    if (text === '.ping') {
      const start = Date.now();
      const sent = await sock.sendMessage(sender, { text: '🏓 Pong!' }, { quoted: msg });
      const ping = Date.now() - start;
      await sock.sendMessage(sender, { text: `⏱️ Risposta in ${ping} ms` }, { quoted: sent });
    }

    // ⏱️ Uptime
    if (text === '.uptime') {
      const uptime = new Date(process.uptime() * 1000).toISOString().substr(11, 8);
      await sock.sendMessage(sender, { text: `🕒 Uptime: ${uptime}` }, { quoted: msg });
    }

    // 📊 Stato
    if (text === '.status') {
      const uptime = new Date(process.uptime() * 1000).toISOString().substr(11, 8);
      const mem = process.memoryUsage();
      const usedMB = (mem.rss / 1024 / 1024).toFixed(2);
      const info = `
📊 *Stato del bot*
------------------------
🕒 Uptime: ${uptime}
📦 RAM usata: ${usedMB} MB
🧠 Comando AI: .ai <domanda>
📶 Ping: .ping
📋 Info: .status, .uptime
🤣 Extra: .barzelletta, .insulta
      `;
      await sock.sendMessage(sender, { text: info }, { quoted: msg });
    }
  });
}

// TCP server dummy (per evitare che Koyeb chiuda il container)
require('net').createServer().listen(process.env.PORT || 8080);

// Avvio
startBot();

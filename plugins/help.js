const { default: axios } = require('axios');
const { bot } = require('../lib');

bot(
  {
    pattern: 'help',
    fromMe: false,
    desc: 'Mostra i comandi disponibili',
    type: 'info',
  },
  async (message) => {
    const testo = `
🤖 *TrashBot AI – Comandi disponibili*:

🧠 .ai <domanda> — Chiedi qualcosa a ChatGPT
📶 .ping — Controlla se il bot è attivo
🤣 .barzelletta — Barzelletta divertente casuale
😈 .insulta @utente — Insulto ironico (solo in gruppo)
📋 .help — Questo menu
    `;
    await message.reply(testo);
  }
);

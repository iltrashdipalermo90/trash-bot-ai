const { bot } = require('../lib');

const insulti = [
  "Sei la prova che l’evoluzione può fare retromarcia.",
  "Hai il carisma di un toast bagnato.",
  "Persino Clippy era più utile di te.",
  "Il tuo Wi-Fi è più stabile delle tue idee.",
  "Più che un utente, sei un bug.",
  "Sei il motivo per cui esistono le istruzioni illustrate.",
  "Nemmeno ChatGPT riesce a starti dietro.",
  "Hai la velocità di Windows 98 con 3 antivirus attivi.",
  "Sei stato taggato da un bot. Pensa te.",
  "Hai meno logica di un oroscopo su TikTok.",
  "Quando parli, anche il silenzio sbadiglia.",
  "Il tuo entusiasmo è paragonabile a un lunedì mattina.",
  "Più confuso di un camaleonte su una scacchiera.",
  "Hai l'umorismo di una stampante inceppata.",
  "Il tuo QI è inferiore al livello batteria del mio mouse.",
];

bot(
  {
    pattern: 'insulta ?(.*)',
    fromMe: false,
    desc: 'Insulta un utente (solo per ridere)',
    type: 'fun',
  },
  async (message, match) => {
    const target = message.mentionedJid?.[0] || message.reply_message?.jid || null;
    const insulto = insulti[Math.floor(Math.random() * insulti.length)];

    if (message.isGroup && target) {
      await message.send(insulto, { mentions: [target] });
    } else if (message.isGroup && !target) {
      await message.reply('Tagga qualcuno da insultare... oppure ti insulto io? 😏');
    } else {
      await message.reply(insulto); // in privato senza crash
    }
  }
);

const { bot } = require('../lib');

const barzellette = [
  "Perché il computer è andato dal dottore? Perché aveva un virus!",
  "Sai perché gli scheletri non combattono tra loro? Perché non hanno il fegato!",
  "Perché il pomodoro arrossì? Perché vide l’insalata nuda!",
  "Cosa fa un matematico in palestra? Solleva dati.",
  "Come si chiama un gatto che fa il DJ? Miao-mix.",
];

bot(
  {
    pattern: 'barzelletta',
    fromMe: false,
    desc: 'Barzelletta casuale',
    type: 'fun',
  },
  async (message) => {
    const random = barzellette[Math.floor(Math.random() * barzellette.length)];
    await message.reply(random);
  }
);

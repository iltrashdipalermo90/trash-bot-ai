const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ["TrashBot", "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  if (!sock.authState.creds.registered) {
    const number = "18033035111"; // <--- METTI IL TUO NUMERO QUI!
    const code = await sock.requestPairingCode(number);
    console.log("🔑 Inserisci questo codice su WhatsApp:", code);
  }

  sock.ev.on("connection.update", ({ connection }) => {
    if (connection === "open") {
      console.log("🤖 Bot connesso correttamente a WhatsApp!");
    }
  });
}

startBot();

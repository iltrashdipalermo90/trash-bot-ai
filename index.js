import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import fs from "fs";

async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState("./auth");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      browser: ["TrashBot", "Chrome", "1.0.0"],
      logger: pino({ level: "silent" }),
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: true,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
      if (connection === "connecting") {
        console.log("ðŸ”— Connessione a WhatsApp in corso...");
      }

      if (connection === "close") {
        const shouldReconnect =
          lastDisconnect?.error instanceof Boom &&
          lastDisconnect.error.output?.statusCode !==
            DisconnectReason.loggedOut &&
          lastDisconnect.error.output?.statusCode !== 401;

        const reason = lastDisconnect?.error?.output?.statusCode;
        console.log(
          `âŒ Connessione chiusa. Motivo: ${reason || "Sconosciuto"}`,
        );

        if (reason === 401 || reason === 428) {
          console.log(
            "ðŸ”‘ Errore di autenticazione. Eliminando sessione corrente...",
          );
          try {
            fs.rmSync("./auth", { recursive: true, force: true });
            console.log(
              "ðŸ“‚ Cartella auth eliminata. Riavvia per nuova autenticazione.",
            );
          } catch (error) {
            console.log(
              "âš ï¸ Errore nell'eliminare la cartella auth:",
              error.message,
            );
          }
          return;
        }

        console.log("ðŸ”„ Riconnessione:", shouldReconnect);

        if (shouldReconnect) {
          console.log("â³ Tentativo di riconnessione in 5 secondi...");
          setTimeout(() => startBot(), 5000);
        } else {
          console.log(
            "ðŸš« Bot disconnesso definitivamente. Riavvia il programma per ricollegare.",
          );
        }
        return;
      }

      // Richiedi pairing code se non autenticato
      if (connection === "connecting" && !fs.existsSync("./auth/creds.json")) {
        console.log("ðŸ“± Richiesta pairing code...");
        console.log("1. Apri WhatsApp sul telefono");
        console.log("2. Vai su Impostazioni > Dispositivi collegati");
        console.log("3. Tocca 'Collega un dispositivo'");
        console.log(
          "4. Inserisci il numero di telefono e attendi il pairing code",
        );
        console.log(
          "âš ï¸ IMPORTANTE: Sostituisci il numero nel codice con il tuo!",
        );

        // SOSTITUISCI CON IL TUO NUMERO (formato: 39 + numero senza +)
        const phoneNumber = "18033035111";

        try {
          const code = await sock.requestPairingCode(phoneNumber);
          console.log("ðŸ”‘ Pairing Code:", code);
          console.log("5. Inserisci questo codice in WhatsApp");
        } catch (error) {
          console.log(
            "âŒ Errore nel richiedere il pairing code:",
            error.message,
          );
        }
      }

      if (connection === "open") {
        console.log("âœ… Bot connesso correttamente a WhatsApp!");
        console.log(`ðŸ“ž Numero: ${sock.user?.id}`);
      }
    });

    // Handle incoming messages
    sock.ev.on("messages.upsert", async ({ messages }) => {
      const message = messages[0];
      if (!message.message || message.key.fromMe) return;

      const text =
        message.message.conversation ||
        message.message.extendedTextMessage?.text;

      if (text) {
        console.log(`ðŸ“© Messaggio ricevuto: ${text}`);

        // Simple echo for testing
        if (text.toLowerCase() === "ping") {
          await sock.sendMessage(message.key.remoteJid, {
            text: "ðŸ“ Pong! Bot attivo.",
          });
        }
      }
    });

    return sock;
  } catch (error) {
    console.error("âŒ Errore nell'avvio del bot:", error.message);
    console.log("ðŸ”„ Riprovo in 10 secondi...");
    setTimeout(() => startBot(), 10000);
  }
}

console.log("ðŸ¤– Avvio TrashBot...");
startBot().catch(console.error);

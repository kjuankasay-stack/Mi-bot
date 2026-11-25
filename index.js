const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const app = express();
let ultimoCodigo = 'Esperando codigo...';
app.get('/', (req, res) => res.send('Bot activo - ve a /codigo'));
app.get('/codigo', (req, res) => { res.send(`<h1 style="font-size:50px;text-align:center">TU CODIGO:<br>${ultimoCodigo}</h1><p style="text-align:center">Este codigo NO cambia. Si se vence, haz un Manual Deploy nuevo en Render</p>`); });
app.listen(process.env.PORT || 3000, () => console.log('Server en 3000'));
async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger: pino({ level: 'silent' }), printQRInTerminal: false, browser: ['Chrome', 'Chrome', '1.0.0'] });
  sock.ev.on('creds.update', saveCreds);
  if (!state.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode('51929792392');
        ultimoCodigo = code;
        console.log('TU CODIGO ES:', code);
      } catch (e) { console.log('Error:', e.message); }
    }, 8000);
  }
  sock.ev.on('connection.update', (update) => {
    if (update.connection === 'open') { ultimoCodigo = '¡CONECTADO!'; console.log('¡Conectado!'); }
  });
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    const lower = text.toLowerCase().trim();
    if (lower === 'hola' || lower === 'menu' || lower === '.menu') await sock.sendMessage(from, { text: 'Hola! Soy tu bot 🤖\n\nEscribe:\n.hola - Saludo\n.menu - Ver menu\n.info - Info del bot' });
    else if (lower === '.hola') await sock.sendMessage(from, { text: 'Hola! ¿Cómo estás? 😊' });
    else if (lower === '.info') await sock.sendMessage(from, { text: 'Bot creado con Baileys + Render' });
  });
}
start();

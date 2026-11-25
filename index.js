const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

const app = express();
let ultimoCodigo = 'Esperando codigo...';

app.get('/', (req, res) => res.send('Bot activo - ve a /codigo'));
app.get('/codigo', (req, res) => {
  res.send(`<h1 style="font-size:50px;text-align:center">TU CODIGO:<br>${ultimoCodigo}</h1><p style="text-align:center">Recarga la pagina para ver el nuevo</p><script>setTimeout(()=>location.reload(), 5000)</script>`);
});
app.listen(process.env.PORT || 3000, () => console.log('Server en 3000'));

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger: pino({ level: 'silent' }), printQRInTerminal: false, browser: ['Chrome', 'Chrome', '1.0.0'] });
  sock.ev.on('creds.update', saveCreds);
  if (!state.creds.registered) {
    const numero = '51929792392';
    const pedirCodigo = async () => {
      try {
        const code = await sock.requestPairingCode(numero);
        ultimoCodigo = code;
        console.log('TU CODIGO NUEVO ES:', code);
      } catch (e) { console.log('Error:', e.message); }
    };
    setTimeout(pedirCodigo, 8000);
    setInterval(pedirCodigo, 25000);
  }
  sock.ev.on('connection.update', (update) => {
    if (update.connection === 'open') { ultimoCodigo = '¡CONECTADO!'; console.log('¡Conectado!'); }
    if (update.connection === 'close') console.log('Desconectado:', update.lastDisconnect?.error?.output?.statusCode);
  });
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    const lower = text.toLowerCase().trim();
    if (lower === 'hola' || lower === 'menu' || lower === '.menu') {
      await sock.sendMessage(from, { text: 'Hola! Soy tu bot 🤖\n\nEscribe:\n.hola - Saludo\n.menu - Ver menu\n.info - Info del bot' });
    } else if (lower === '.hola') await sock.sendMessage(from, { text: 'Hola! ¿Cómo estás? 😊' });
    else if (lower === '.info') await sock.sendMessage(from, { text: 'Bot creado con Baileys + Render' });
  });
}
start();

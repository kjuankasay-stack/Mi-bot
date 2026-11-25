const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const QRCode = require('qrcode');

const app = express();
let ultimoQR = null;

app.get('/', (req, res) => res.send('Bot activo - ve a /qr'));

app.get('/qr', async (req, res) => {
  if (!ultimoQR) return res.send('<h1>Esperando QR... recarga en 5 segundos</h1><script>setTimeout(()=>location.reload(),5000)</script>');
  const img = await QRCode.toDataURL(ultimoQR);
  res.send(`
    <h1 style="text-align:center">Escanea este QR RAPIDO</h1>
    <div style="text-align:center"><img src="${img}" style="width:340px;height:340px"></div>
    <p style="text-align:center; font-size:18px">Tienes 20 segundos para escanearlo.<br>Si falla, NO escanees el mismo 2 veces.</p>
    <div style="text-align:center"><button onclick="location.reload()" style="padding:10px 20px; font-size:18px">Recargar QR</button></div>
  `);
});

app.listen(process.env.PORT || 3000, () => console.log('Server en 3000'));

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ 
    version, 
    auth: state, 
    logger: pino({ level: 'silent' }), 
    printQRInTerminal: false, 
    browser: ['Chrome', 'Chrome', '1.0.0'] 
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => {
    const connection = update.connection;
    const qr = update.qr;
    if (qr) { ultimoQR = qr; console.log('Nuevo QR generado'); }
    if (connection === 'open') { ultimoQR = null; console.log('¡CONECTADO!'); }
    if (connection === 'close') console.log('Desconectado');
  });
  sock.ev.on('messages.upsert', async (data) => {
    const messages = data.messages;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    const lower = text.toLowerCase().trim();
    if (lower === 'hola' || lower === 'menu' || lower === '.menu') {
      await sock.sendMessage(from, { text: 'Hola! Soy tu bot 🤖\n\nEscribe:\n.hola - Saludo\n.menu - Ver menu\n.info - Info del bot' });
    } else if (lower === '.hola') {
      await sock.sendMessage(from, { text: 'Hola! ¿Cómo estás? 😊' });
    } else if (lower === '.info') {
      await sock.sendMessage(from, { text: 'Bot creado con Baileys + Render' });
    }
  });
}
start();

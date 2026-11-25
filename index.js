const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false,
    browser: ['Mi Bot', 'Chrome', '1.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  // Si no está vinculado, pide código de emparejamiento
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode('51929792392');
        console.log('================================');
        console.log('TU CODIGO ES: ' + code);
        console.log('================================');
        console.log('Ve a WhatsApp > Dispositivos vinculados > Vincular con numero de telefono y escribelo');
      } catch (e) {
        console.log('Error pidiendo codigo:', e.message);
      }
    }, 3000);
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexion cerrada, reconectando:', shouldReconnect);
      if (shouldReconnect) start();
    } else if (connection === 'open') {
      console.log('¡CONECTADO! Ya esta vinculado');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
    console.log('Mensaje:', text);
    if (text.toLowerCase() === '!ping') {
      await sock.sendMessage(m.key.remoteJid, { text: 'pong 🏓' });
    }
  });
}
start();

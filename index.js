const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Chrome', 'Chrome', '1.0.0']
    })

    sock.ev.on('creds.update', saveCreds)

    let codigoPedido = false

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'connecting' && !codigoPedido && !sock.authState.creds.registered) {
            codigoPedido = true
            // Esperamos 4 segundos a que WhatsApp esté listo
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode('51929792392')
                    console.log('TU CODIGO ES: ' + code)
                } catch (e) {
                    console.log('Error pidiendo codigo, reintentando...', e.message)
                    codigoPedido = false
                }
            }, 4000)
        }

        if (connection === 'open') {
            console.log('CONECTADO! Ya puedes usar el bot')
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
            console.log('Desconectado, codigo: ' + reason)
            if (reason !== DisconnectReason.loggedOut) {
                console.log('Reconectando...')
                start()
            } else {
                console.log('Sesion cerrada, borra la carpeta auth')
            }
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return
        const texto = m.message.conversation || m.message.extendedTextMessage?.text || ''
        if (texto.toLowerCase() === 'hola') {
            await sock.sendMessage(m.key.remoteJid, { text: 'Hola! Bot funcionando' })
        }
    })
}

start()

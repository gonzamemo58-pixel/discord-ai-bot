require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { CohereClientV2 } = require('cohere-ai');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('OK');
});

app.listen(PORT, () => {
    console.log(`Servidor web escuchando en el puerto ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const cohere = new CohereClientV2({ token: process.env.COHERE_API_KEY });

// 1554571667169214525
const CANAL_IA_ID = '1554571667169214525'; 

const INSTRUCCION_SISTEMA = 'Eres un asistente de Discord muy amigable, divertido y respondes con emojis. Recuerdas el contexto de la conversación.';

// Objeto para almacenar el historial de cada usuario
const historialConversaciones = new Map();

client.once('ready', () => {
    console.log(`🤖 ¡Bot con memoria corregida conectado con éxito como ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.channel.id === CANAL_IA_ID) {
        await message.channel.sendTyping();

        const usuarioId = message.author.id;

        // Si el usuario no tiene historial, se lo creamos inicializado
        if (!historialConversaciones.has(usuarioId)) {
            historialConversaciones.set(usuarioId, []);
        }

        let historial = historialConversaciones.get(usuarioId);

        // Agregamos el nuevo mensaje del usuario al historial
        historial.push({ role: 'user', content: message.content });

        // Estructuramos los mensajes finales incluyendo SIEMPRE el rol del sistema al inicio
        const mensajesParaIA = [
            { role: 'system', content: INSTRUCCION_SISTEMA },
            ...historial
        ];

        try {
            const response = await cohere.chat({
                model: 'command-r-plus-08-2024',
                messages: mensajesParaIA
            });

            let respuestaIA = '';
            if (response.message && response.message.content) {
                if (Array.isArray(response.message.content)) {
                    respuestaIA = response.message.content[0].text || response.message.content;
                } else if (response.message.content.text) {
                    respuestaIA = response.message.content.text;
                } else {
                    respuestaIA = response.message.content;
                }
            }

            if (respuestaIA && respuestaIA.length > 0) {
                // Guardamos la respuesta de la IA en el historial del usuario
                historial.push({ role: 'assistant', content: respuestaIA });

                // Mantener el historial corto (últimos 10 mensajes) de forma limpia
                if (historial.length > 10) {
                    historial = historial.slice(-10);
                    historialConversaciones.set(usuarioId, historial);
                }

                if (respuestaIA.length > 2000) {
                    await message.reply(respuestaIA.substring(0, 1999));
                } else {
                    await message.reply(respuestaIA);
                }
            } else {
                await message.reply('❌ No pude extraer el texto de la respuesta de la IA.');
            }

        } catch (error) {
            console.error('Error con Cohere:', error);
            await message.reply('❌ Hubo un problema al procesar tu respuesta con la nueva IA.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

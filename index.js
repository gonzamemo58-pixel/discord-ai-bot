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

const historialConversaciones = new Map();

client.once('ready', () => {
    console.log(`🤖 ¡Bot con memoria blindada conectado como ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.channel.id === CANAL_IA_ID) {
        await message.channel.sendTyping();

        const usuarioId = message.author.id;

        if (!historialConversaciones.has(usuarioId)) {
            historialConversaciones.set(usuarioId, []);
        }

        let historial = historialConversaciones.get(usuarioId);

        historial.push({ role: 'user', content: message.content });

        const mensajesParaIA = [
            { role: 'system', content: INSTRUCCION_SISTEMA },
            ...historial
        ];

        try {
            const response = await cohere.chat({
                model: 'command-r-plus-08-2024',
                messages: mensajesParaIA
            });

            // EXTRACCIÓN BLINDADA PARA LA ÚLTIMA VERSIÓN DE COHERE
            let respuestaIA = '';
            if (response.message && response.message.content) {
                if (Array.isArray(response.message.content)) {
                    respuestaIA = response.message.content[0]?.text || response.message.content[0] || '';
                } else if (response.message.content.text) {
                    respuestaIA = response.message.content.text;
                } else {
                    respuestaIA = response.message.content;
                }
            }

            if (respuestaIA && respuestaIA.length > 0) {
                historial.push({ role: 'assistant', content: respuestaIA });

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
    

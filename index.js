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

// Objeto para almacenar el historial de cada usuario en la memoria del servidor
const historialConversaciones = new Map();

client.once('ready', () => {
    console.log(`🤖 ¡Bot con memoria conectado con éxito como ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.channel.id === CANAL_IA_ID) {
        await message.channel.sendTyping();

        const usuarioId = message.author.id;

        // Si el usuario no tiene historial, se lo creamos con la instrucción del sistema
        if (!historialConversaciones.has(usuarioId)) {
            historialConversaciones.set(usuarioId, [
                { role: 'system', content: 'Eres un asistente de Discord muy amigable, divertido y respondes con emojis. Recuerdas el contexto de la conversación.' }
            ]);
        }

        // Obtenemos el historial actual del usuario
        let historial = historialConversaciones.get(usuarioId);

        // Agregamos el nuevo mensaje del usuario al historial
        historial.push({ role: 'user', content: message.content });

        try {
            // Le pasamos TODO el historial guardado a Cohere en lugar de solo un mensaje
            const response = await cohere.chat({
                model: 'command-r-plus-08-2024',
                messages: historial
            });

            let respuestaIA = '';
            if (response.message && response.message.content) {
                if (Array.isArray(response.message.content)) {
                    respuestaIA = response.message.content.text;
                } else if (response.message.content.text) {
                    respuestaIA = response.message.content.text;
                } else {
                    respuestaIA = response.message.content;
                }
            }

            if (respuestaIA && respuestaIA.length > 0) {
                // Guardamos la respuesta de la IA en el historial para que la recuerde en la próxima pregunta
                historial.push({ role: 'assistant', content: respuestaIA });

                // Limitar el historial a los últimos 10 mensajes para no gastar la cuota gratis
                if (historial.length > 11) {
                    // Mantenemos el mensaje de sistema del inicio [0] y cortamos los más viejos
                    historial = [historial[0], ...historial.slice(-10)];
                    historialConversaciones.set(usuarioId, historial);
                }

                if (respuestaIA.length > 2000) {
                    await message.reply(respuestaIA.substring(0, 1999));
                } else {
                    await message.reply(respuestaIA);
                }
            } else {
                await message.reply('❌ Cohere respondió, pero el formato de texto no es válido.');
            }

        } catch (error) {
            console.error('Error con Cohere:', error);
            await message.reply('❌ Hubo un problema al procesar tu respuesta con la nueva IA.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

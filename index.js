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

client.once('ready', () => {
    console.log(`🤖 ¡Bot de Cohere conectado con éxito como ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.channel.id === CANAL_IA_ID) {
        await message.channel.sendTyping();

        try {
            const response = await cohere.chat({
                model: 'command-r-plus-08-2024',
                messages: [
                    { role: 'system', content: 'Eres un asistente de Discord muy amigable, divertido y respondes con emojis.' },
                    { role: 'user', content: message.content }
                ]
            });

            // LECTURA CORREGIDA Y SEGURA PARA LA VERSIÓN LATEST DE COHERE
            let respuestaIA = '';
            if (response.message && response.message.content) {
                if (Array.isArray(response.message.content)) {
                    respuestaIA = response.message.content[0].text;
                } else if (response.message.content.text) {
                    respuestaIA = response.message.content.text;
                } else {
                    respuestaIA = response.message.content;
                }
            }

            if (respuestaIA && respuestaIA.length > 0) {
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

const { Client, GatewayIntentBits } = require('discord.js');
const { CohereClientV2 } = require('cohere-ai');

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

            if (response.message && response.message.content) {
                const respuestaIA = response.message.content.text;
                
                if (respuestaIA.length > 2000) {
                    await message.reply(respuestaIA.substring(0, 1999));
                } else {
                    await message.reply(respuestaIA);
                }
            } else {
                await message.reply('❌ No pude generar texto en este momento.');
            }

        } catch (error) {
            console.error('Error con Cohere:', error);
            await message.reply('❌ Hubo un problema al procesar tu respuesta con la nueva IA.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

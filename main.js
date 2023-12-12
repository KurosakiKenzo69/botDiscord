const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const config = require('./config'); // Importe directement le fichier de configuration
const ytdl = require('ytdl-core');

const bot = new Client({ 
    intents: [
        GatewayIntentBits.GuildVoiceStates, 
        GatewayIntentBits.GuildMessages
    ],
    PermissionFlagsBits: [
        PermissionFlagsBits.Administrator
    ] 
});

bot.on('guildMemberAdd', member => {
    const channel = member.guild.systemChannel; // Récupère le salon système (généralement celui où apparaissent les messages de bienvenue)
    if (!channel) return; // Vérifie si le salon existe

    const memberCount = member.guild.memberCount; // Récupère le nombre total d'utilisateurs sur le serveur
    channel.send(`Bienvenue, ${member.user.username} ! Tu es le ${memberCount}ème utilisateur du serveur.`);
});


const queue = new Map();

bot.once('ready', () => {
    console.log(`${bot.user.tag} est en ligne !`);
});

bot.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!play')) return;

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('Rejoins un salon vocal Discord premièrement');

    const args = message.content.split(' ');
    const song = args[1];

    const serverQueue = queue.get(message.guild.id);
    const songInfo = await ytdl.getInfo(song);

    const songData = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    };

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true,
        };

        queue.set(message.guild.id, queueContruct);
        queueContruct.songs.push(songData);

        try {
            const connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0]);
        } catch (err) {
            console.error(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(songData);
        return message.channel.send(`${songData.title} a été ajouté à la liste d'attente !`);
    }
});

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection.play(ytdl(song.url))
        .on('finish', () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on('error', error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

bot.login(config.token); // Utilise le token depuis le fichier de configuration

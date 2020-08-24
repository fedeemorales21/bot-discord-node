require('dotenv').config()
const { Client } = require("discord.js")
const ytdl = require("ytdl-core")

const prefix = '!'
const client = new Client()
const queue = new Map()

client.on("ready", () => {
    console.log(`Se conecto ${client.user.tag}`)
})

client.on("message", async message => {
    if (message.author.bot) return
    if (!message.content.startsWith(prefix)) return

    const serverQueue = queue.get(message.guild.id)

    if (message.content.startsWith(`${prefix}play`)) {
        execute(message, serverQueue)
        return
    }
    if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue)
        return
    }
    if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue)
        return
    } 
    message.channel.send("Comando invalido")
    
})


const execute = async (message, serverQueue) => {
    const args = message.content.split(" ")

    const voiceChannel = message.member.voice.channel
    if (!voiceChannel){
        return message.channel.send(
            "Se necesita un canal de voz para reproducir música"
        )
    }    
    const permissions = voiceChannel.permissionsFor(message.client.user)
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "Necesito permisos"
        )
    }

    if (args[1] == '') {
        return message.channel.send(
            "Falta url"
        )
    }
    const songInfo = await ytdl.getInfo(args[1])
    const song = {
        title: songInfo.title,
        url: songInfo.video_url
    }
    
    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        }

        queue.set(message.guild.id, queueContruct)

        queueContruct.songs.push(song)

        try {
            let connection = await voiceChannel.join()
            queueContruct.connection = connection
            play(message.guild, queueContruct.songs[0])
        } catch (err) {
            console.log(err)
            queue.delete(message.guild.id)
            return message.channel.send(err)
        }
    } else {
        serverQueue.songs.push(song)
        return message.channel.send(`${song.title} se agregó a la cola`)
    }
}


const skip = (message, serverQueue) => {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Para pararla, anda al canal de voz"
        )
    if (!serverQueue)
        return message.channel.send("Esa cancion no puede ser salteada")
    serverQueue.connection.dispatcher.end()
}


const stop = (message, serverQueue) => {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Parala en el canal de voz"
        )
    serverQueue.songs = []
    serverQueue.connection.dispatcher.end()
}


const play = (guild, song) => {
    const serverQueue = queue.get(guild.id)
    if (!song) {
        serverQueue.voiceChannel.leave()
        queue.delete(guild.id)
        return
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift()
            play(guild, serverQueue.songs[0])
        })
        .on("error", error => console.error(error))
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5)
    serverQueue.textChannel.send(`Suena: **${song.title}**`)
}

client.login(process.env.TOKEN_DISCORD)

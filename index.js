require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

// ------------------
// CLIENT
// ------------------
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ------------------
// COMMANDS
// ------------------
const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Test if the bot is online'),

    new SlashCommandBuilder()
        .setName('bn')
        .setDescription('Send a breaking news announcement')
        .addStringOption(option =>
            option.setName('message').setDescription('Breaking news content').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('report')
        .setDescription('Report a user with a message')
        .addUserOption(opt => opt.setName('user').setDescription('User to report').setRequired(true))
        .addStringOption(opt => opt.setName('message').setDescription('Reason or message').setRequired(true)),

    new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to mute').setRequired(true)),

    new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to unmute').setRequired(true)),

    new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete a number of messages')
        .addIntegerOption(opt => opt.setName('number').setDescription('Number of messages to delete').setRequired(true)),

    new SlashCommandBuilder()
        .setName('factcheck')
        .setDescription('Request fact-check verification')
].map(cmd => cmd.toJSON ? cmd.toJSON() : cmd);

// ------------------
// REGISTER COMMANDS
// ------------------
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
(async () => {
    try {
        console.log('🔁 Registering commands...');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, '1456940227334635674'),
            { body: commands }
        );
        console.log('✅ Commands registered');
    } catch (err) {
        console.error(err);
    }
})();

// ------------------
// READY
// ------------------
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// ------------------
// AI Ping Cooldown
// ------------------
const cooldowns = new Map();
const COOLDOWN_SECONDS = 20;

// ------------------
// INTERACTIONS
// ------------------
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const allowedRoles = ['Owner', 'Admin', 'Moderator', 'Warscope Journalist'];

    // /ping
    if (interaction.commandName === 'ping') {
        return interaction.reply('🏓 Pong!');
    }

    // /bn
    if (interaction.commandName === 'bn') {
        if (!interaction.member.roles.cache.some(r => allowedRoles.includes(r.name))) {
            return interaction.reply({ content: '❌ Not allowed.', ephemeral: true });
        }
        const message = interaction.options.getString('message');
        const BREAKING_NEWS_ROLE_ID = '1456944933335334997';
        const embed = new EmbedBuilder()
            .setTitle('🚨 BREAKING NEWS 🚨')
            .setDescription(message)
            .setColor(0xff0000)
            .setTimestamp();
        await interaction.channel.send({
            content: `<@&${BREAKING_NEWS_ROLE_ID}>`,
            embeds: [embed],
            allowedMentions: { roles: [BREAKING_NEWS_ROLE_ID] }
        });
        return interaction.reply({ content: '✅ Breaking news sent.', ephemeral: true });
    }

    // /report
    if (interaction.commandName === 'report') {
        const user = interaction.options.getUser('user');
        const messageText = interaction.options.getString('message');
        const STAFF_CHANNEL_ID = '1456978097277763737';
        const staffChannel = await interaction.guild.channels.fetch(STAFF_CHANNEL_ID).catch(() => null);
        if (!staffChannel) return interaction.reply({ content: '❌ Staff channel not found.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🚩 User Report')
            .addFields(
                { name: 'Reported User', value: `${user.tag} (${user.id})` },
                { name: 'Reporter', value: `${interaction.user.tag} (${interaction.user.id})` },
                { name: 'Message', value: messageText }
            )
            .setColor(0xff5555)
            .setTimestamp();

        await staffChannel.send({ content: `<@&1457256394653696040>`, embeds: [embed] }); // pings Staff
        return interaction.reply({ content: '✅ Report sent.', ephemeral: true });
    }

    // /mute
    if (interaction.commandName === 'mute') {
        if (!interaction.member.roles.cache.some(r => allowedRoles.includes(r.name))) {
            return interaction.reply({ content: '❌ Not allowed.', ephemeral: true });
        }
        const user = interaction.options.getUser('user');
        const mutedRole = interaction.guild.roles.cache.get('1456943872080085004');
        const member = await interaction.guild.members.fetch(user.id);
        if (!member.roles.cache.has(mutedRole.id)) await member.roles.add(mutedRole);
        return interaction.reply({ content: `✅ ${user.tag} muted.`, ephemeral: true });
    }

    // /unmute
    if (interaction.commandName === 'unmute') {
        if (!interaction.member.roles.cache.some(r => allowedRoles.includes(r.name))) {
            return interaction.reply({ content: '❌ Not allowed.', ephemeral: true });
        }
        const user = interaction.options.getUser('user');
        const mutedRole = interaction.guild.roles.cache.get('1456943872080085004');
        const member = await interaction.guild.members.fetch(user.id);
        if (member.roles.cache.has(mutedRole.id)) await member.roles.remove(mutedRole);
        return interaction.reply({ content: `✅ ${user.tag} unmuted.`, ephemeral: true });
    }

    // /purge
    if (interaction.commandName === 'purge') {
        if (!interaction.member.roles.cache.some(r => allowedRoles.includes(r.name))) {
            return interaction.reply({ content: '❌ Not allowed.', ephemeral: true });
        }
        const number = interaction.options.getInteger('number');
        const messages = await interaction.channel.messages.fetch({ limit: number });
        await interaction.channel.bulkDelete(messages);
        return interaction.reply({ content: `✅ Deleted ${number} messages.`, ephemeral: true });
    }

    // /factcheck
    if (interaction.commandName === 'factcheck') {
        const channel = await client.channels.fetch('1456979623081410702');
        await channel.send({ content: `<@&1456943412837089402> Verification request!` });
        return interaction.reply({ content: '✅ Fact check requested.', ephemeral: true });
    }
});

// ------------------
// AI Ping Handler
// ------------------
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.mentions.has(client.user)) return;

    const userId = message.author.id;
    const now = Date.now();
    if (cooldowns.has(userId) && now - cooldowns.get(userId) < COOLDOWN_SECONDS * 1000) {
        return message.reply({ content: `⏳ Please wait ${COOLDOWN_SECONDS}s before asking again.`, allowedMentions: { repliedUser: false } });
    }
    cooldowns.set(userId, now);

    const question = message.content
        .replace(`<@${client.user.id}>`, '')
        .replace(`<@!${client.user.id}>`, '')
        .trim();

    if (!question) return message.reply({ content: 'Please ask a question when pinging me.', allowedMentions: { repliedUser: false } });

    await message.channel.sendTyping();

    try {
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/google/functiongemma-270m-it',
            { inputs: question },
            { headers: { Authorization: `Bearer ${process.env.HF_API_KEY}` }, timeout: 25000 }
        );

        const answer = response.data[0]?.generated_text || 'No answer found.';
        await message.reply({
            content: `${answer}\n📰 WarScope AI | Based on open-source reporting & OSINT. Information may evolve as events develop.`,
            allowedMentions: { repliedUser: false }
        });
    } catch (err) {
        console.error(err);
        await message.reply({ content: '⚠️ Unable to retrieve information at this time.', allowedMentions: { repliedUser: false } });
    }
});

// ------------------
// LOGIN
// ------------------
client.login(process.env.BOT_TOKEN);

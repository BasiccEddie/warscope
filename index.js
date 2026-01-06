require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

/* ======================
   CLIENT
====================== */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

/* ======================
   COMMAND DEFINITIONS
====================== */

const commands = [
    // Slash command: /ping
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Test if the bot is online'),

    // Slash command: /bn
    new SlashCommandBuilder()
        .setName('bn')
        .setDescription('Send a breaking news announcement')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('Breaking news content')
                .setRequired(true)
        ),

    // Message Context Menu: Report Message
    {
        name: 'Report message',
        type: 3 // MESSAGE context menu
    }
].map(cmd => cmd.toJSON ? cmd.toJSON() : cmd);

/* ======================
   REGISTER COMMANDS
====================== */

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log('🔁 Registering commands...');
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                '1456940227334635674' // Your server ID
            ),
            { body: commands }
        );
        console.log('✅ Commands registered');
    } catch (err) {
        console.error(err);
    }
})();

/* ======================
   READY
====================== */

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ======================
   INTERACTIONS
====================== */

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand()) return;

    /* ===== /ping ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === 'ping') {
        return interaction.reply('🏓 Pong!');
    }

    /* ===== /bn ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === 'bn') {

        const ALLOWED_ROLES = ['Owner', 'Admin', 'Warscope Journalist'];
        const hasPermission = interaction.member.roles.cache.some(role =>
            ALLOWED_ROLES.includes(role.name)
        );

        if (!hasPermission) {
            return interaction.reply({
                content: '❌ You are not allowed to use this command.',
                ephemeral: true
            });
        }

        const message = interaction.options.getString('message');
        const BREAKING_NEWS_ROLE_ID = '1456944933335334997';

        const embed = new EmbedBuilder()
            .setTitle('🚨 BREAKING NEWS 🚨')
            .setDescription(`<@&${BREAKING_NEWS_ROLE_ID}>\n\n${message}`)
            .setColor(0xff0000)
            .setTimestamp();

        await interaction.channel.send({
            embeds: [embed],
            allowedMentions: { roles: [BREAKING_NEWS_ROLE_ID] }
        });

        return interaction.reply({
            content: '✅ Breaking news sent.',
            ephemeral: true
        });
    }

    /* ===== Report Message Context Menu ===== */
    if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Report message') {

        const MOD_CHANNEL_ID = '1456978097277763737'; // Mod channel for reports
        const STAFF_ROLE_ID = '1457256394653696040';   // Staff role to ping

        const reportedMessage = interaction.targetMessage;
        const modChannel = await interaction.guild.channels.fetch(MOD_CHANNEL_ID).catch(() => null);

        if (!modChannel) {
            return interaction.reply({
                content: '❌ Mod channel not found.',
                ephemeral: true
            });
        }

        const reportedContent = reportedMessage.content || reportedMessage.attachments.first()?.url || '*No text (embed or attachment)*';

        const embed = new EmbedBuilder()
            .setTitle('🚩 Message Report')
            .setColor(0xff5555)
            .addFields(
                { name: 'Reported User', value: `${reportedMessage.author.tag} (${reportedMessage.author.id})` },
                { name: 'Reporter', value: `${interaction.user.tag} (${interaction.user.id})` },
                { name: 'Channel', value: `<#${reportedMessage.channel.id}>` },
                { name: 'Message', value: reportedContent }
            )
            .setTimestamp()
            .setFooter({ text: `Message ID: ${reportedMessage.id}` });

        // Send to mod channel and ping Staff
        await modChannel.send({
            content: `<@&${STAFF_ROLE_ID}>`,
            embeds: [embed],
            allowedMentions: { roles: [STAFF_ROLE_ID] }
        });

        return interaction.reply({
            content: '✅ Report sent to staff.',
            ephemeral: true
        });
    }
});

/* ======================
   LOGIN
====================== */

client.login(process.env.BOT_TOKEN);

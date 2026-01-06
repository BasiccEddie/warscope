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
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* ======================
   COMMAND DEFINITIONS
====================== */

const commands = [
    // /ping
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Test if the bot is online'),

    // /bn
    new SlashCommandBuilder()
        .setName('bn')
        .setDescription('Send a breaking news announcement')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Breaking news content')
                .setRequired(true)
        ),

    // /report
    new SlashCommandBuilder()
        .setName('report')
        .setDescription('Report a user to staff')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to report')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Reason for report')
                .setRequired(true)
        ),

    // /mute
    new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to mute')
                .setRequired(true)
        ),

    // /unmute
    new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to unmute')
                .setRequired(true)
        ),

    // /purge
    new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete messages in this channel')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
        ),

    // /factcheck
    new SlashCommandBuilder()
        .setName('factcheck')
        .setDescription('Send a factcheck alert')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Factcheck content')
                .setRequired(true)
        ),

    // Message context menu: Report message
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
                '1456940227334635674' // YOUR SERVER ID
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

    const STAFF_ROLE_ID = '1457256394653696040';
    const STAFF_CHANNEL_ID = '1456978097277763737';
    const MUTED_ROLE_ID = '1456943872080085004';
    const FACTCHECK_CHANNEL_ID = '1456979623081410702';
    const FACTCHECK_ROLE_ID = '1456943412837089402';

    const adminRoles = ['Owner','Admin','Moderator'];
    const bnRoles = ['Owner','Admin','Warscope Journalist'];

    /* ===== /ping ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === 'ping') {
        return interaction.reply('🏓 Pong!');
    }

    /* ===== /bn ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === 'bn') {
        if (!interaction.member.roles.cache.some(r => bnRoles.includes(r.name))) {
            return interaction.reply({ content: '❌ You are not allowed to use this command.', ephemeral: true });
        }
        const message = interaction.options.getString('message');
        const embed = new EmbedBuilder()
            .setTitle('🚨 BREAKING NEWS 🚨')
            .setDescription(message)
            .setColor(0xff0000)
            .setTimestamp();

        await interaction.channel.send({
            content: `<@&1456944933335334997>`,
            embeds: [embed],
            allowedMentions: { roles: ['1456944933335334997'] }
        });

        return interaction.reply({ content: '✅ Breaking news sent.', ephemeral: true });
    }

    /* ===== /report ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === 'report') {
        const reportedUser = interaction.options.getUser('user');
        const message = interaction.options.getString('message');
        const staffChannel = await interaction.guild.channels.fetch(STAFF_CHANNEL_ID).catch(() => null);
        if (!staffChannel) return interaction.reply({ content: '❌ Staff channel not found.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🚩 User Report')
            .setColor(0xff5555)
            .addFields(
                { name: 'Reported User', value: `${reportedUser.tag} (${reportedUser.id})` },
                { name: 'Reporter', value: `${interaction.user.tag} (${interaction.user.id})` },
                { name: 'Message', value: message }
            )
            .setTimestamp();

        await staffChannel.send({
            content: `<@&${STAFF_ROLE_ID}>`,
            embeds: [embed],
            allowedMentions: { roles: [STAFF_ROLE_ID] }
        });

        return interaction.reply({ content: '✅ Report sent to staff.', ephemeral: true });
    }

    /* ===== Right click -> Report message ===== */
    if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Report message') {
        const reportedMessage = interaction.targetMessage;
        const staffChannel = await interaction.guild.channels.fetch(STAFF_CHANNEL_ID).catch(() => null);
        if (!staffChannel) return interaction.reply({ content: '❌ Staff channel not found.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🚩 Message Report')
            .setColor(0xff5555)
            .addFields(
                { name: 'Reported User', value: `${reportedMessage.author.tag} (${reportedMessage.author.id})` },
                { name: 'Reporter', value: `${interaction.user.tag} (${interaction.user.id})` },
                { name: 'Channel', value: `<#${reportedMessage.channel.id}>` },
                { name: 'Message', value: reportedMessage.content || '*No text (embed or attachment)*' }
            )
            .setTimestamp()
            .setFooter({ text: `Message ID: ${reportedMessage.id}` });

        await staffChannel.send({
            content: `<@&${STAFF_ROLE_ID}>`,
            embeds: [embed],
            allowedMentions: { roles: [STAFF_ROLE_ID] }
        });

        return interaction.reply({ content: '✅ Report sent to staff.', ephemeral: true });
    }

    /* ===== /mute ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === 'mute') {
        if (!interaction.member.roles.cache.some(r => adminRoles.includes(r.name))) {
            return interaction.reply({ content: '❌ You cannot use this command.', ephemeral: true });
        }
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
        await member.roles.add(MUTED_ROLE_ID).catch(() => null);
        return interaction.reply({ content: `✅ ${user.tag} has been muted.`, ephemeral: true });
    }

    /* ===== /unmute ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === 'unmute') {
        if (!interaction.member.roles.cache.some(r => adminRoles.includes(r.name))) {
            return interaction.reply({ content: '❌ You cannot use this command.', ephemeral: true });
        }
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
        await member.roles.remove(MUTED_ROLE_ID).catch(() => null);
        return interaction.reply({ content: `✅ ${user.tag} has been unmuted.`, ephemeral: true });
    }

    /* ===== /purge ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === 'purge') {
        if (!interaction.member.roles.cache.some(r => adminRoles.includes(r.name))) {
            return interaction.reply({ content: '❌ You cannot use this command.', ephemeral: true });
        }
        const amount = interaction.options.getInteger('amount');
        if (amount < 1 || amount > 100) return interaction.reply({ content: '❌ Can delete 1-100 messages only.', ephemeral: true });
        await interaction.channel.bulkDelete(amount, true).catch(() => null);
        return interaction.reply({ content: `✅ Deleted ${amount} messages.`, ephemeral: true });
    }

    /* ===== /factcheck ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === 'factcheck') {
        const message = interaction.options.getString('message');
        const factChannel = await interaction.guild.channels.fetch(FACTCHECK_CHANNEL_ID).catch(() => null);
        if (!factChannel) return interaction.reply({ content: '❌ Factcheck channel not found.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🧐 Factcheck Request')
            .setColor(0x00ffff)
            .setDescription(message)
            .addFields({ name: 'Requested by', value: `${interaction.user.tag} (${interaction.user.id})` })
            .setTimestamp();

        await factChannel.send({
            content: `<@&${FACTCHECK_ROLE_ID}>`,
            embeds: [embed],
            allowedMentions: { roles: [FACTCHECK_ROLE_ID] }
        });

        return interaction.reply({ content: '✅ Factcheck request sent.', ephemeral: true });
    }
});

/* ======================
   LOGIN
====================== */

client.login(process.env.BOT_TOKEN);

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
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
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
        .setDescription('Report a user')
        .addUserOption(option =>
            option.setName('user')
                  .setDescription('The user to report')
                  .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('message')
                  .setDescription('The reason or message for the report')
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
        .setDescription('Delete a number of messages')
        .addIntegerOption(option =>
            option.setName('amount')
                  .setDescription('Number of messages to delete')
                  .setRequired(true)
        ),

    // /factcheck
    new SlashCommandBuilder()
        .setName('factcheck')
        .setDescription('Send a fact check request')
        .addStringOption(option =>
            option.setName('message')
                  .setDescription('Message or content to verify')
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

        const allowedRoles = ['Owner','Admin','Warscope Journalist'];
        const hasPermission = interaction.member.roles.cache.some(role => allowedRoles.includes(role.name));

        if (!hasPermission) {
            return interaction.reply({ content: '❌ You are not allowed to use this command.', ephemeral: true });
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

    /* ===== /report ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === 'report') {
        const STAFF_CHANNEL_ID = '1456978097277763737';
        const reportedUser = interaction.options.getUser('user');
        const reportMessage = interaction.options.getString('message');

        const staffChannel = await interaction.guild.channels.fetch(STAFF_CHANNEL_ID).catch(() => null);
        if (!staffChannel) return interaction.reply({ content: '❌ Staff channel not found.', ephemeral: true });

        const REPORT_ROLE_ID = '1457256394653696040';

        const embed = new EmbedBuilder()
            .setTitle('🚩 User Report')
            .addFields(
                { name: 'Reported User', value: `${reportedUser.tag} (${reportedUser.id})` },
                { name: 'Reporter', value: `${interaction.user.tag} (${interaction.user.id})` },
                { name: 'Message', value: reportMessage }
            )
            .setColor(0xff5555)
            .setTimestamp();

        await staffChannel.send({
            content: `<@&${REPORT_ROLE_ID}>`,
            embeds: [embed],
            allowedMentions: { roles: [REPORT_ROLE_ID] }
        });

        return interaction.reply({ content: '✅ Report sent to staff.', ephemeral: true });
    }

    /* ===== /mute ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === 'mute') {
        const allowedRoles = ['Owner','Admin','Moderator'];
        if (!interaction.member.roles.cache.some(role => allowedRoles.includes(role.name))) {
            return interaction.reply({ content: '❌ You cannot use this command.', ephemeral: true });
        }

        const mutedUser = interaction.options.getMember('user');
        const MUTED_ROLE_ID = '1456943872080085004';
        if (!mutedUser) return interaction.reply({ content: 'User not found.', ephemeral: true });

        await mutedUser.roles.add(MUTED_ROLE_ID).catch(() => null);
        return interaction.reply({ content: `✅ ${mutedUser.user.tag} has been muted.`, ephemeral: true });
    }

    /* ===== /unmute ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === 'unmute') {
        const allowedRoles = ['Owner','Admin','Moderator'];
        if (!interaction.member.roles.cache.some(role => allowedRoles.includes(role.name))) {
            return interaction.reply({ content: '❌ You cannot use this command.', ephemeral: true });
        }

        const mutedUser = interaction.options.getMember('user');
        const MUTED_ROLE_ID = '1456943872080085004';
        if (!mutedUser) return interaction.reply({ content: 'User not found.', ephemeral: true });

        await mutedUser.roles.remove(MUTED_ROLE_ID).catch(() => null);
        return interaction.reply({ content: `✅ ${mutedUser.user.tag} has been unmuted.`, ephemeral: true });
    }

    /* ===== /purge ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === 'purge') {
        const allowedRoles = ['Owner','Admin','Moderator'];
        if (!interaction.member.roles.cache.some(role => allowedRoles.includes(role.name))) {
            return interaction.reply({ content: '❌ You cannot use this command.', ephemeral: true });
        }

        const amount = interaction.options.getInteger('amount');
        if (!amount || amount < 1 || amount > 100) return interaction.reply({ content: 'Enter a number between 1-100.', ephemeral: true });

        await interaction.channel.bulkDelete(amount).catch(() => null);
        return interaction.reply({ content: `✅ Deleted ${amount} messages.`, ephemeral: true });
    }

    /* ===== /factcheck ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === 'factcheck') {
        const FACTCHECK_CHANNEL_ID = '1456979623081410702';
        const FACTCHECK_ROLE_ID = '1456943412837089402';

        const messageContent = interaction.options.getString('message');
        const factcheckChannel = await interaction.guild.channels.fetch(FACTCHECK_CHANNEL_ID).catch(() => null);
        if (!factcheckChannel) return interaction.reply({ content: '❌ Factcheck channel not found.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('📝 Factcheck Request')
            .setDescription(messageContent)
            .setColor(0x00ffff)
            .setTimestamp();

        await factcheckChannel.send({
            content: `<@&${FACTCHECK_ROLE_ID}>`,
            embeds: [embed],
            allowedMentions: { roles: [FACTCHECK_ROLE_ID] }
        });

        return interaction.reply({ content: '✅ Factcheck request sent.', ephemeral: true });
    }

    /* ===== Message Context Menu ===== */
    if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Report message') {
        const STAFF_CHANNEL_ID = '1456978097277763737';
        const REPORT_ROLE_ID = '1457256394653696040';

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
            content: `<@&${REPORT_ROLE_ID}>`,
            embeds: [embed],
            allowedMentions: { roles: [REPORT_ROLE_ID] }
        });

        return interaction.reply({ content: '✅ Report sent to staff.', ephemeral: true });
    }
});

/* ======================
   LOGIN
====================== */

client.login(process.env.BOT_TOKEN);

// =======================
// 1️⃣ IMPORTS
// =======================
require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');
const OpenAI = require('openai');

// =======================
// 2️⃣ OPENAI CONFIG
// =======================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// =======================
// 3️⃣ CLIENT
// =======================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// =======================
// 4️⃣ COMMAND DEFINITIONS
// =======================
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Test if the bot is online'),
  new SlashCommandBuilder()
    .setName('bn')
    .setDescription('Send a breaking news announcement')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Breaking news content')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report a user with message')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to report')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Reason or message')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to mute')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to unmute')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete messages in the channel')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('factcheck')
    .setDescription('Send verification request to Fact Checkers')
].map(cmd => cmd.toJSON());

// =======================
// 5️⃣ REGISTER COMMANDS
// =======================
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('🔁 Registering commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, '1456940227334635674'), // YOUR SERVER ID
      { body: commands }
    );
    console.log('✅ Commands registered');
  } catch (err) {
    console.error(err);
  }
})();

// =======================
// 6️⃣ READY EVENT
// =======================
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// =======================
// 7️⃣ SLASH COMMAND HANDLER
// =======================
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand()) return;

  const allowedRoles = ['Owner', 'Admin', 'Moderator', 'Warscope Journalist'];

  // ===== /ping =====
  if (interaction.isChatInputCommand() && interaction.commandName === 'ping') {
    return interaction.reply('🏓 Pong!');
  }

  // ===== /bn =====
  if (interaction.isChatInputCommand() && interaction.commandName === 'bn') {
    const hasPermission = interaction.member.roles.cache.some(role => allowedRoles.includes(role.name));
    if (!hasPermission)
      return interaction.reply({ content: '❌ You are not allowed to use this command.', ephemeral: true });

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

  // ===== /report =====
  if (interaction.isChatInputCommand() && interaction.commandName === 'report') {
    const STAFF_CHANNEL_ID = '1456978097277763737';
    const staffChannel = await interaction.guild.channels.fetch(STAFF_CHANNEL_ID).catch(() => null);
    if (!staffChannel) return interaction.reply({ content: '❌ Staff channel not found.', ephemeral: true });

    const reportedUser = interaction.options.getUser('user');
    const messageText = interaction.options.getString('message');

    const embed = new EmbedBuilder()
      .setTitle('🚩 User Report')
      .addFields(
        { name: 'Reported User', value: `${reportedUser.tag} (${reportedUser.id})` },
        { name: 'Reporter', value: `${interaction.user.tag} (${interaction.user.id})` },
        { name: 'Message', value: messageText }
      )
      .setColor(0xff5555)
      .setTimestamp();

    await staffChannel.send({
      content: `<@&1457256394653696040>`, // Staff role ping
      embeds: [embed],
      allowedMentions: { roles: ['1457256394653696040'] }
    });

    return interaction.reply({ content: '✅ Report sent to staff.', ephemeral: true });
  }

  // ===== /mute =====
  if (interaction.isChatInputCommand() && interaction.commandName === 'mute') {
    const hasPermission = interaction.member.roles.cache.some(role => allowedRoles.includes(role.name));
    if (!hasPermission)
      return interaction.reply({ content: '❌ You are not allowed to use this command.', ephemeral: true });

    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);
    const MUTED_ROLE_ID = '1456943872080085004';
    await member.roles.add(MUTED_ROLE_ID);

    return interaction.reply({ content: `✅ ${user.tag} has been muted.`, ephemeral: true });
  }

  // ===== /unmute =====
  if (interaction.isChatInputCommand() && interaction.commandName === 'unmute') {
    const hasPermission = interaction.member.roles.cache.some(role => allowedRoles.includes(role.name));
    if (!hasPermission)
      return interaction.reply({ content: '❌ You are not allowed to use this command.', ephemeral: true });

    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);
    const MUTED_ROLE_ID = '1456943872080085004';
    await member.roles.remove(MUTED_ROLE_ID);

    return interaction.reply({ content: `✅ ${user.tag} has been unmuted.`, ephemeral: true });
  }

  // ===== /purge =====
  if (interaction.isChatInputCommand() && interaction.commandName === 'purge') {
    const hasPermission = interaction.member.roles.cache.some(role => allowedRoles.includes(role.name));
    if (!hasPermission)
      return interaction.reply({ content: '❌ You are not allowed to use this command.', ephemeral: true });

    const amount = interaction.options.getInteger('amount');
    await interaction.channel.bulkDelete(amount, true);
    return interaction.reply({ content: `✅ Deleted ${amount} messages.`, ephemeral: true });
  }

  // ===== /factcheck =====
  if (interaction.isChatInputCommand() && interaction.commandName === 'factcheck') {
    const FACT_CHANNEL_ID = '1456979623081410702';
    const FACT_ROLE_ID = '1456943412837089402';
    const channel = await interaction.guild.channels.fetch(FACT_CHANNEL_ID);
    if (!channel) return interaction.reply({ content: '❌ Fact check channel not found.', ephemeral: true });

    await channel.send(`<@&${FACT_ROLE_ID}> Verification requested by ${interaction.user.tag}`);
    return interaction.reply({ content: '✅ Fact check request sent.', ephemeral: true });
  }
});

// =======================
// 8️⃣ MESSAGE PING AI
// =======================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const question = message.content
    .replace(`<@${client.user.id}>`, '')
    .replace(`<@!${client.user.id}>`, '')
    .trim();

  if (!question) {
    return message.reply({
      content: "Please include a question when pinging me.",
      allowedMentions: { repliedUser: false }
    });
  }

  await message.channel.sendTyping();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are WarScope AI, an OSINT-style global conflict and geopolitics analyst.
- Be neutral
- Avoid propaganda
- Avoid speculation
- Clearly state uncertainty
- Do not fabricate events
- Keep responses concise and factual
`
        },
        { role: "user", content: question }
      ],
      temperature: 0.2
    });

    const answerText = completion.choices[0].message.content;

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setDescription(answerText)
      .setFooter({
        text: "📰 WarScope AI | Based on open-source reporting & OSINT. Information may evolve as events develop."
      })
      .setTimestamp();

    await message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });

  } catch (error) {
    console.error(error);
    await message.reply({
      content: "⚠️ Unable to retrieve verified information at this time.",
      allowedMentions: { repliedUser: false }
    });
  }
});

// =======================
// 9️⃣ LOGIN
// =======================
client.login(process.env.BOT_TOKEN);

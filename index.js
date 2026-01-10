// =======================
// 1️⃣ IMPORTS
// =======================
require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

// =======================
// 2️⃣ CLIENT
// =======================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// =======================
// 3️⃣ COOLDOWN
// =======================
const cooldowns = new Map(); // Map<userId, timestamp>

// =======================
// 4️⃣ COMMAND DEFINITIONS
// =======================
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Test if the bot is online'),
  new SlashCommandBuilder()
    .setName('bn')
    .setDescription('Send a breaking news announcement')
    .addStringOption(option =>
      option.setName('message').setDescription('Breaking news content').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report a user with message')
    .addUserOption(option => option.setName('user').setDescription('User to report').setRequired(true))
    .addStringOption(option => option.setName('message').setDescription('Reason or message').setRequired(true)),
  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user')
    .addUserOption(option => option.setName('user').setDescription('User to mute').setRequired(true)),
  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a user')
    .addUserOption(option => option.setName('user').setDescription('User to unmute').setRequired(true)),
  new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete messages in the channel')
    .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete').setRequired(true)),
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
  if (!interaction.isChatInputCommand()) return;

  const modRoles = ['Owner', 'Admin', 'Moderator', 'Warscope Journalist'];

  // ===== /ping =====
  if (interaction.commandName === 'ping') return interaction.reply('🏓 Pong!');

  // ===== /bn =====
  if (interaction.commandName === 'bn') {
    const hasPermission = interaction.member.roles.cache.some(r => modRoles.includes(r.name));
    if (!hasPermission) return interaction.reply({ content: '❌ Not allowed', ephemeral: true });

    const message = interaction.options.getString('message');
    const BREAKING_NEWS_ROLE_ID = '1456944933335334997';
    const embed = new EmbedBuilder().setTitle('🚨 BREAKING NEWS 🚨').setDescription(message).setColor(0xff0000).setTimestamp();

    await interaction.channel.send({
      content: `<@&${BREAKING_NEWS_ROLE_ID}>`,
      embeds: [embed],
      allowedMentions: { roles: [BREAKING_NEWS_ROLE_ID] }
    });
    return interaction.reply({ content: '✅ Breaking news sent.', ephemeral: true });
  }

  // ===== /report =====
  if (interaction.commandName === 'report') {
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
      content: `<@&1457256394653696040>`,
      embeds: [embed],
      allowedMentions: { roles: ['1457256394653696040'] }
    });

    return interaction.reply({ content: '✅ Report sent to staff.', ephemeral: true });
  }

  // ===== /mute =====
  if (interaction.commandName === 'mute') {
    const hasPermission = interaction.member.roles.cache.some(r => modRoles.includes(r.name));
    if (!hasPermission) return interaction.reply({ content: '❌ Not allowed', ephemeral: true });

    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);
    const MUTED_ROLE_ID = '1456943872080085004';
    await member.roles.add(MUTED_ROLE_ID);
    return interaction.reply({ content: `✅ ${user.tag} has been muted.`, ephemeral: true });
  }

  // ===== /unmute =====
  if (interaction.commandName === 'unmute') {
    const hasPermission = interaction.member.roles.cache.some(r => modRoles.includes(r.name));
    if (!hasPermission) return interaction.reply({ content: '❌ Not allowed', ephemeral: true });

    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);
    const MUTED_ROLE_ID = '1456943872080085004';
    await member.roles.remove(MUTED_ROLE_ID);
    return interaction.reply({ content: `✅ ${user.tag} has been unmuted.`, ephemeral: true });
  }

  // ===== /purge =====
  if (interaction.commandName === 'purge') {
    const hasPermission = interaction.member.roles.cache.some(r => modRoles.includes(r.name));
    if (!hasPermission) return interaction.reply({ content: '❌ Not allowed', ephemeral: true });

    const amount = interaction.options.getInteger('amount');
    await interaction.channel.bulkDelete(amount, true);
    return interaction.reply({ content: `✅ Deleted ${amount} messages.`, ephemeral: true });
  }

  // ===== /factcheck =====
  if (interaction.commandName === 'factcheck') {
    const FACT_CHANNEL_ID = '1456979623081410702';
    const FACT_ROLE_ID = '1456943412837089402';
    const channel = await interaction.guild.channels.fetch(FACT_CHANNEL_ID);
    if (!channel) return interaction.reply({ content: '❌ Fact check channel not found.', ephemeral: true });

    await channel.send(`<@&${FACT_ROLE_ID}> Verification requested by ${interaction.user.tag}`);
    return interaction.reply({ content: '✅ Fact check request sent.', ephemeral: true });
  }
});

// =======================
// 8️⃣ MESSAGE PING AI (Hugging Face GPT-Neo 125M)
// =======================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const now = Date.now();
  const userId = message.author.id;

  // Cooldown 20s per user
  if (cooldowns.has(userId) && now - cooldowns.get(userId) < 20000) {
    return message.reply({ content: '⏳ Please wait 20s before asking again.', allowedMentions: { repliedUser: false } });
  }
  cooldowns.set(userId, now);

  const question = message.content
    .replace(`<@${client.user.id}>`, '')
    .replace(`<@!${client.user.id}>`, '')
    .trim();

  if (!question) {
    return message.reply({ content: "Please include a question when pinging me.", allowedMentions: { repliedUser: false } });
  }

  await message.channel.sendTyping();

  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/EleutherAI/gpt-neo-125M',
      { inputs: question },
      { headers: { Authorization: `Bearer ${process.env.HF_API_KEY}` }, timeout: 20000 }
    );

    const answerText = response.data[0]?.generated_text || "No response generated.";

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setDescription(answerText)
      .setFooter({
        text: "📰 WarScope AI | Based on open-source reporting & OSINT. Information may evolve as events."
      })
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });

  } catch (error) {
    console.error("Hugging Face API error:", error.message);
    await message.reply({ content: "⚠️ Unable to retrieve verified information at this time.", allowedMentions: { repliedUser: false } });
  }
});

// =======================
// 9️⃣ LOGIN
// =======================
client.login(process.env.BOT_TOKEN);

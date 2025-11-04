const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionsBitField } = require('discord.js');

// قراءة بيانات التطبيق بدون توكن من config.json
const config = require('./config.json');

// إنشاء العميل
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// أوامر البوت
const commands = [
  new SlashCommandBuilder()
    .setName('roleadd')
    .setDescription('يعطي رتبة لشخص')
    .addUserOption(o => o.setName('member').setDescription('الشخص').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('الرتبة').setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('roleremove')
    .setDescription('يزيل رتبة من شخص')
    .addUserOption(o => o.setName('member').setDescription('الشخص').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('الرتبة').setRequired(true))
    .toJSON()
];

// عند تسجيل دخول البوت
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN); // التوكن من Environment Variable
  try {
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );
    console.log('✅ Commands registered');
  } catch (e) {
    console.error(e);
  }
});

// التعامل مع الأوامر
client.on('interactionCreate', async i => {
  if (!i.isChatInputCommand()) return;

  if (!i.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return i.reply({ content: '❌ ما عندك صلاحية إدارة الرتب.', ephemeral: true });
  }

  const member = i.options.getMember('member');
  const role = i.options.getRole('role');

  if (!member || !role) {
    return i.reply({ content: 'تأكد من المنشنات.', ephemeral: true });
  }

  if (i.guild.members.me.roles.highest.position <= role.position) {
    return i.reply({ content: '❌ ما أقدر أتعامل مع هالرتبة لأنها أعلى من دوري.', ephemeral: true });
  }

  try {
    if (i.commandName === 'roleadd') {
      await member.roles.add(role);
      await i.reply({ content: `✅ تمت إضافة ${role} إلى ${member}.` });
    } else if (i.commandName === 'roleremove') {
      await member.roles.remove(role);
      await i.reply({ content: `✅ تمت إزالة ${role} من ${member}.` });
    }
  } catch (err) {
    console.log(err);
    i.reply({ content: '❌ حدث خطأ، تأكد إن عندي صلاحية إدارة الرتب.', ephemeral: true });
  }
});

// تسجيل الدخول باستخدام التوكن من Environment Variable
client.login(process.env.TOKEN);

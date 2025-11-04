const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionsBitField } = require('discord.js');
const config = require('./config.json');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

function parseDuration(durationStr) {
  const regex = /^(\d+)(s|m|h|d|w|mo|y)$/i;
  const match = durationStr.match(regex);
  if (!match) return null;

  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch(unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    case 'w': return num * 7 * 24 * 60 * 60 * 1000;
    case 'mo': return num * 30 * 24 * 60 * 60 * 1000;
    case 'y': return num * 365 * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

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
    .toJSON(),

  new SlashCommandBuilder()
    .setName('tempmute')
    .setDescription('كتم شخص مؤقت')
    .addUserOption(o => o.setName('member').setDescription('الشخص').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('سبب الكتم').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('مدة الكتم (مثال: 5m, 2h)').setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('tempkick')
    .setDescription('طرد شخص بدون مدة')
    .addUserOption(o => o.setName('member').setDescription('الشخص').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('سبب الطرد').setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('tempwarn')
    .setDescription('تحذير شخص مؤقت')
    .addUserOption(o => o.setName('member').setDescription('الشخص').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('سبب التحذير').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('مدة التحذير (مثال: 10m, 1h)').setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('حظر شخص مؤقت')
    .addUserOption(o => o.setName('member').setDescription('الشخص').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('سبب الحظر').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('مدة الحظر (مثال: 1d, 1w)').setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('tempunmute')
    .setDescription('رفع الميوت عن شخص')
    .addUserOption(o => o.setName('member').setDescription('الشخص').setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('tempunban')
    .setDescription('رفع البان عن شخص')
    .addUserOption(o => o.setName('member').setDescription('الشخص').setRequired(true))
    .toJSON()
];

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
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

async function sendTempMessage(channel, content) {
  const msg = await channel.send(content);
  setTimeout(() => msg.delete().catch(() => {}), 3000);
}

client.on('interactionCreate', async i => {
  if (!i.isChatInputCommand()) return;

  const member = i.options.getMember('member');
  const reason = i.options.getString('reason');
  let durationMs;
  if (['tempmute','tempban','tempwarn'].includes(i.commandName)) {
    const durationStr = i.options.getString('duration');
    durationMs = parseDuration(durationStr);
    if (!durationMs) return sendTempMessage(i.channel, '❌ صيغة المدة غير صحيحة. مثال: 5m, 2h, 1d, 1w, 1mo, 1y');
  }

  if (['roleadd','roleremove'].includes(i.commandName)) {
    if (!i.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return sendTempMessage(i.channel, '❌ ما عندك صلاحية إدارة الرتب.');
    }
  }

  if (['tempmute','tempkick','tempwarn','tempban','tempunmute','tempunban'].includes(i.commandName)) {
    if (!i.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return sendTempMessage(i.channel, '❌ ما عندك صلاحية للتعامل مع هذا الشخص.');
    }
  }

  try {
    switch(i.commandName) {
      case 'roleadd':
        await member.roles.add(i.options.getRole('role'));
        await sendTempMessage(i.channel, `✅ تمت إضافة الرتبة لـ ${member}`);
        break;
      case 'roleremove':
        await member.roles.remove(i.options.getRole('role'));
        await sendTempMessage(i.channel, `✅ تمت إزالة الرتبة من ${member}`);
        break;
      case 'tempmute':
        await member.timeout(durationMs, reason);
        await sendTempMessage(i.channel, `✅ تم كتم ${member} لمدة ${i.options.getString('duration')}. السبب: ${reason}`);
        break;
      case 'tempkick':
        await member.kick(reason);
        await sendTempMessage(i.channel, `✅ تم طرد ${member}. السبب: ${reason}`);
        break;
      case 'tempwarn':
        await sendTempMessage(i.channel, `⚠️ تم تحذير ${member} لمدة ${i.options.getString('duration')}. السبب: ${reason}`);
        break;
      case 'tempban':
        await member.ban({ reason });
        setTimeout(async () => {
          await i.guild.members.unban(member.id).catch(() => {});
        }, durationMs);
        await sendTempMessage(i.channel, `✅ تم حظر ${member} مؤقتاً لمدة ${i.options.getString('duration')}. السبب: ${reason}`);
        break;
      case 'tempunmute':
        await member.timeout(null).catch(() => {});
        await sendTempMessage(i.channel, `✅ تم رفع الميوت عن ${member}`);
        break;
      case 'tempunban':
        await i.guild.members.unban(member.id).catch(() => {});
        await sendTempMessage(i.channel, `✅ تم رفع البان عن ${member}`);
        break;
    }
  } catch(err) {
    console.log(err);
    await sendTempMessage(i.channel, '❌ حدث خطأ أثناء تنفيذ الأمر.');
  }
});

client.login(process.env.TOKEN);

import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { discordFirestoreAdmin } from '../services/firestore.service.js';
import { xpProgress, getRankEmoji } from '../utils/xp.js';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('View a user profile card')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to view')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user') || interaction.user;
  const profile = await discordFirestoreAdmin.getUserProfile(targetUser.id);

  if (!profile) {
    await interaction.editReply({
      content: `No profile found for ${targetUser.username}. They need to send a message first!`
    });
    return;
  }

  const progress = xpProgress(profile.xp);
  const rankEmoji = getRankEmoji(profile.rank);
  const profileUrl = discordFirestoreAdmin.getProfileUrl(targetUser.id);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`${targetUser.username}'s Profile`)
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: '🏆 Rank', value: `${rankEmoji} ${profile.rank.toUpperCase()}`, inline: true },
      { name: '📊 Level', value: `${profile.level}`, inline: true },
      { name: '⚡ XP', value: `${profile.xp.toLocaleString()}`, inline: true },
      { name: '📈 Progress', value: `${progress.current}/${progress.required} (${progress.percentage.toFixed(1)}%)`, inline: false },
      { name: '💬 Messages', value: `${profile.messageCount || 0}`, inline: true },
      { name: '📅 Joined', value: `<t:${Math.floor(new Date(profile.joinedAt).getTime() / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: `View full profile card at ${profileUrl}` })
    .setTimestamp();

  if (profile.roles.length > 0) {
    embed.addFields({
      name: '🎭 Custom Roles',
      value: profile.roles.slice(0, 5).map((r: string) => `\`${r}\``).join(', ') + (profile.roles.length > 5 ? '...' : ''),
      inline: false
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

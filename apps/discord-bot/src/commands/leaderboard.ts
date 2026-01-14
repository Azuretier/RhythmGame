import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { xpService } from '../services/xp.service.js';
import { getRankEmoji } from '../utils/xp.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View the XP leaderboard')
  .addIntegerOption(option =>
    option
      .setName('limit')
      .setDescription('Number of users to display (default: 10)')
      .setMinValue(5)
      .setMaxValue(25)
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const limit = interaction.options.getInteger('limit') || 10;
  const leaderboard = await xpService.getLeaderboard(limit);

  if (leaderboard.length === 0) {
    await interaction.editReply({
      content: 'No users found on the leaderboard yet!'
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🏆 Azure Community Leaderboard')
    .setDescription('Top members by XP')
    .setTimestamp();

  const medals = ['🥇', '🥈', '🥉'];

  leaderboard.forEach((profile, index) => {
    const medal = medals[index] || `#${index + 1}`;
    const rankEmoji = getRankEmoji(profile.rank);
    
    embed.addFields({
      name: `${medal} ${profile.username}`,
      value: `${rankEmoji} ${profile.rank.toUpperCase()} • Level ${profile.level} • ${profile.xp.toLocaleString()} XP`,
      inline: false
    });
  });

  await interaction.editReply({ embeds: [embed] });
}

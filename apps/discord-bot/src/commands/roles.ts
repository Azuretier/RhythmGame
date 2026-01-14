import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { discordFirestoreAdmin } from '../services/firestore.service.js';

export const data = new SlashCommandBuilder()
  .setName('roles')
  .setDescription('Get a link to customize your roles');

export async function execute(interaction: ChatInputCommandInteraction) {
  const profileUrl = discordFirestoreAdmin.getProfileUrl(interaction.user.id);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎭 Customize Your Roles')
    .setDescription(
      `Visit your profile page to select and customize your roles!\n\n` +
      `**Available Role Categories:**\n` +
      `• Special Roles - Cutie, Luminelle, Archeborne\n` +
      `• Interest Roles - Dreamer, Community Fan, Thinker, Smart\n` +
      `• Contribution Roles - Rising Star, Gifted, Artist, Creator, Translator\n` +
      `• Activity Roles - Dream Maker\n\n` +
      `[Click here to customize your roles](${profileUrl})`
    )
    .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: 'Choose roles that best represent you!' });

  await interaction.reply({ embeds: [embed] });
}

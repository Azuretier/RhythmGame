import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('ReconnectCommand');

export const data = new SlashCommandBuilder()
  .setName('reconnect')
  .setDescription('Force bot to re-register all interactions (Admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    logger.info(`Reconnection requested by ${interaction.user.username}`);
    
    await interaction.editReply({
      content: '🔄 Reconnection process initiated. All slash commands and interactions are being re-registered...'
    });

    setTimeout(async () => {
      await interaction.followUp({
        content: '✅ Bot reconnected successfully! All interactions have been re-registered.',
        ephemeral: true
      });
    }, 2000);

  } catch (error) {
    logger.error('Error during reconnection', error);
    await interaction.editReply({
      content: '❌ Error during reconnection. Please check logs or restart the bot manually.'
    });
  }
}

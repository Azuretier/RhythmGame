import { Events, type Interaction } from 'discord.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('InteractionCreate');

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const command = (interaction.client as any).commands.get(interaction.commandName);

      if (!command) {
        logger.warn(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.error(`Error executing ${interaction.commandName}`, error);
        
        const errorMessage = { content: 'There was an error while executing this command!', ephemeral: true };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    } else if (interaction.isButton()) {
      if (interaction.customId === 'agree_rules') {
        const { handleRulesAgreement } = await import('../commands/rules.js');
        await handleRulesAgreement(interaction);
      }
    }
  }
};

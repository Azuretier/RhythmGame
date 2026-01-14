import { Events, type Message } from 'discord.js';
import { xpService } from '../services/xp.service.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('MessageCreate');

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    try {
      const result = await xpService.processMessageXP(
        message.author.id,
        message.author.username
      );

      if (result.gained && result.leveledUp) {
        const levelUpMessages = [
          `🎉 Congratulations ${message.author}! You've reached **Level ${result.profile!.level}**!`,
          `⭐ Amazing work ${message.author}! You're now **Level ${result.profile!.level}**!`,
          `🚀 Level up! ${message.author} is now **Level ${result.profile!.level}**!`,
        ];

        const randomMessage = levelUpMessages[Math.floor(Math.random() * levelUpMessages.length)];
        
        await message.reply({
          content: randomMessage,
          allowedMentions: { repliedUser: false }
        });

        if (result.rankChanged && message.channel.isSendable()) {
          await message.channel.send({
            content: `👑 ${message.author} has achieved the rank of **${result.profile!.rank.toUpperCase()}**! 👑`
          });
        }
      }

    } catch (error) {
      logger.error('Error processing message XP', error);
    }
  }
};

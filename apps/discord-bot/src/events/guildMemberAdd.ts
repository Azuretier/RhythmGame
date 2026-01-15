import { Events, type GuildMember } from 'discord.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('GuildMemberAdd');

const PRE_MEMBER_ROLE_NAME = 'Pre-Member';

export default {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember) {
    try {
      logger.info(`New member joined: ${member.user.username} (${member.id})`);

      const preMemberRole = member.guild.roles.cache.find(
        role => role.name === PRE_MEMBER_ROLE_NAME
      );

      if (!preMemberRole) {
        logger.warn('Pre-Member role not found. Creating it now...');
        
        const newRole = await member.guild.roles.create({
          name: PRE_MEMBER_ROLE_NAME,
          color: 0x808080,
          reason: 'Auto-created Pre-Member role for new members',
          permissions: []
        });

        await member.roles.add(newRole);
        logger.info(`Created and assigned Pre-Member role to ${member.user.username}`);
      } else {
        await member.roles.add(preMemberRole);
        logger.info(`Assigned Pre-Member role to ${member.user.username}`);
      }

      const welcomeChannel = member.guild.systemChannel;
      if (welcomeChannel) {
        await welcomeChannel.send({
          content: `Welcome ${member}! 👋\n\nPlease read and agree to our rules using the \`/rules\` command to gain full access to the server.`
        });
      }

    } catch (error) {
      logger.error('Error handling new member', error);
    }
  }
};

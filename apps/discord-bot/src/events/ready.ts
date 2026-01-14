import { Events, type Client } from 'discord.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('Ready');

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    logger.info(`Bot ready! Logged in as ${client.user?.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guild(s)`);
    
    client.user?.setActivity('Azure Community', { type: 3 });
  }
};

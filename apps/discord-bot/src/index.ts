import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import { Logger } from './utils/logger.js';

config();

const logger = new Logger('Bot');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(client as any).commands = new Collection();

async function loadCommands() {
  const commands = [];
  const commandsPath = join(__dirname, 'commands');
  const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(filePath);
    
    if ('data' in command && 'execute' in command) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
      logger.info(`Loaded command: ${command.data.name}`);
    } else {
      logger.warn(`Command at ${filePath} is missing required "data" or "execute" property.`);
    }
  }

  return commands;
}

async function loadEvents() {
  const eventsPath = join(__dirname, 'events');
  const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    const event = await import(filePath);
    
    if (event.default) {
      if (event.default.once) {
        client.once(event.default.name, (...args) => event.default.execute(...args));
      } else {
        client.on(event.default.name, (...args) => event.default.execute(...args));
      }
      logger.info(`Loaded event: ${event.default.name}`);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function registerCommands(commands: any[]) {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    const data = await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID!,
        process.env.DISCORD_GUILD_ID!
      ),
      { body: commands },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any[];

    logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error('Error registering commands', error);
  }
}

async function main() {
  try {
    if (!process.env.DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN is not set in environment variables');
    }
    if (!process.env.DISCORD_CLIENT_ID) {
      throw new Error('DISCORD_CLIENT_ID is not set in environment variables');
    }
    if (!process.env.DISCORD_GUILD_ID) {
      throw new Error('DISCORD_GUILD_ID is not set in environment variables');
    }

    logger.info('Starting Azure Community Discord Bot...');

    const commands = await loadCommands();
    await loadEvents();
    await registerCommands(commands);

    await client.login(process.env.DISCORD_TOKEN);

    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      await client.destroy();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start bot', error);
    process.exit(1);
  }
}

main();

export { client };

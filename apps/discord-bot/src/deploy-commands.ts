import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function deployCommands() {
  const commands = [];
  const commandsPath = join(__dirname, 'commands');
  const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(filePath);
    
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      console.log(`✓ Loaded command: ${command.data.name}`);
    }
  }

  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

  try {
    console.log(`\n🔄 Started refreshing ${commands.length} application (/) commands...`);

    const data = await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID!,
        process.env.DISCORD_GUILD_ID!
      ),
      { body: commands },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any[];

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.\n`);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.forEach((cmd: any) => {
      console.log(`   • /${cmd.name} - ${cmd.description}`);
    });

  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

deployCommands();

import { NextRequest, NextResponse } from 'next/server';
import { Client, GatewayIntentBits } from 'discord.js';

// Discord client singleton
let discordClient: Client | null = null;

async function getDiscordClient(): Promise<Client> {
  if (discordClient && discordClient.isReady()) {
    return discordClient;
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error('DISCORD_BOT_TOKEN is not configured');
  }

  discordClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
  });

  await discordClient.login(token);
  
  // Wait for client to be ready
  await new Promise<void>((resolve) => {
    discordClient!.once('ready', () => resolve());
  });

  return discordClient;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, role } = await request.json();

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing userId' },
        { status: 400 }
      );
    }

    if (!role || !['EN', 'JP'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be EN or JP' },
        { status: 400 }
      );
    }

    // Get environment variables
    const guildId = process.env.DISCORD_GUILD_ID;
    const roleEnId = process.env.DISCORD_ROLE_EN;
    const roleJpId = process.env.DISCORD_ROLE_JP;

    if (!guildId || !roleEnId || !roleJpId) {
      return NextResponse.json(
        { error: 'Discord configuration is incomplete' },
        { status: 500 }
      );
    }

    // Get Discord client
    const client = await getDiscordClient();

    // Get guild
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return NextResponse.json(
        { error: 'Discord server not found' },
        { status: 404 }
      );
    }

    // Get member
    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Discord user not found in server. Please make sure you have joined the server.' },
        { status: 404 }
      );
    }

    // Determine which roles to add and remove
    const roleToAdd = role === 'EN' ? roleEnId : roleJpId;
    const roleToRemove = role === 'EN' ? roleJpId : roleEnId;

    // Get role objects
    const addRole = await guild.roles.fetch(roleToAdd);
    const removeRole = await guild.roles.fetch(roleToRemove);

    if (!addRole || !removeRole) {
      return NextResponse.json(
        { error: 'One or more Discord roles not found' },
        { status: 404 }
      );
    }

    // Check if bot has permission to manage roles
    const botMember = await guild.members.fetch(client.user!.id);
    if (!botMember.permissions.has('ManageRoles')) {
      return NextResponse.json(
        { error: 'Bot does not have permission to manage roles' },
        { status: 403 }
      );
    }

    // Check role hierarchy
    if (addRole.position >= botMember.roles.highest.position) {
      return NextResponse.json(
        { error: 'Bot cannot assign this role due to role hierarchy' },
        { status: 403 }
      );
    }

    // Remove the old role if present
    if (member.roles.cache.has(roleToRemove)) {
      await member.roles.remove(removeRole);
    }

    // Add the new role if not already present
    if (!member.roles.cache.has(roleToAdd)) {
      await member.roles.add(addRole);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${role} role`,
      role
    });

  } catch (error) {
    console.error('Error assigning Discord role:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Get environment variables
    const guildId = process.env.DISCORD_GUILD_ID;
    const roleEnId = process.env.DISCORD_ROLE_EN;
    const roleJpId = process.env.DISCORD_ROLE_JP;

    if (!guildId || !roleEnId || !roleJpId) {
      return NextResponse.json(
        { error: 'Discord configuration is incomplete' },
        { status: 500 }
      );
    }

    // Get Discord client
    const client = await getDiscordClient();

    // Get guild
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return NextResponse.json(
        { error: 'Discord server not found' },
        { status: 404 }
      );
    }

    // Get member
    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Discord user not found in server' },
        { status: 404 }
      );
    }

    // Check which role the user has
    let currentRole = null;
    if (member.roles.cache.has(roleEnId)) {
      currentRole = 'EN';
    } else if (member.roles.cache.has(roleJpId)) {
      currentRole = 'JP';
    }

    return NextResponse.json({
      userId,
      currentRole
    });

  } catch (error) {
    console.error('Error fetching Discord role:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

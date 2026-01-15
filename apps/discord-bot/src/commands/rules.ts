import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  type ChatInputCommandInteraction,
  type ButtonInteraction
} from 'discord.js';
import { discordFirestoreAdmin } from '../services/firestore.service.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('RulesCommand');

const MEMBER_ROLE_NAME = 'Member';
const PRE_MEMBER_ROLE_NAME = 'Pre-Member';

const RULES = [
  {
    title: '1. Be Respectful and Inclusive',
    description: 'Treat all community members with respect. No harassment, hate speech, discrimination, or personal attacks. We welcome everyone regardless of background, experience level, or identity.'
  },
  {
    title: '2. Keep Content Appropriate',
    description: 'Share content that is safe for work and appropriate for all ages. No NSFW, illegal, or harmful content. Keep discussions professional and constructive.'
  },
  {
    title: '3. No Spam or Self-Promotion',
    description: 'Avoid excessive self-promotion, spam, or unsolicited advertising. Share your projects in designated channels and contribute meaningfully to discussions.'
  },
  {
    title: '4. Use Channels Appropriately',
    description: 'Post content in the correct channels. Read channel descriptions before posting. Keep conversations on-topic and use threads for extended discussions.'
  },
  {
    title: '5. Respect Privacy and Security',
    description: 'Do not share personal information of others without consent. Keep credentials, API keys, and sensitive data private. Report security issues to moderators.'
  },
  {
    title: '6. Follow Discord Terms of Service',
    description: 'All Discord Terms of Service and Community Guidelines apply. Violations may result in warnings, temporary restrictions, or permanent bans.'
  }
];

export const data = new SlashCommandBuilder()
  .setName('rules')
  .setDescription('View and agree to server rules');

export async function execute(interaction: ChatInputCommandInteraction) {
  const profile = await discordFirestoreAdmin.getUserProfile(interaction.user.id);
  const hasAgreed = profile?.rulesAgreed || false;

  const embed = new EmbedBuilder()
    .setColor(hasAgreed ? 0x57F287 : 0x5865F2)
    .setTitle('📜 Azure Community Rules')
    .setDescription(hasAgreed 
      ? '✅ You have already agreed to these rules.\n\n' 
      : 'Please read and agree to the following rules to gain full access to the server.\n\n'
    );

  for (const rule of RULES) {
    embed.addFields({
      name: rule.title,
      value: rule.description,
      inline: false
    });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('agree_rules')
        .setLabel(hasAgreed ? 'Rules Agreed ✓' : 'I Agree to the Rules')
        .setStyle(hasAgreed ? ButtonStyle.Success : ButtonStyle.Primary)
        .setDisabled(hasAgreed)
    );

  await interaction.reply({ embeds: [embed], components: [row] });
}

export async function handleRulesAgreement(interaction: ButtonInteraction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    let profile = await discordFirestoreAdmin.getUserProfile(interaction.user.id);
    
    if (!profile) {
      profile = {
        id: interaction.user.id,
        username: interaction.user.username,
        avatarUrl: interaction.user.displayAvatarURL(),
        xp: 0,
        level: 0,
        rank: 'accordian',
        rulesAgreed: false,
        roles: ['member'],
        joinedAt: new Date().toISOString()
      };
    }

    if (profile.rulesAgreed) {
      await interaction.editReply({
        content: '✅ You have already agreed to the rules!'
      });
      return;
    }

    profile.rulesAgreed = true;
    await discordFirestoreAdmin.setUserProfile(interaction.user.id, profile);

    const guild = interaction.guild;
    if (!guild) return;

    const member = await guild.members.fetch(interaction.user.id);
    
    const preMemberRole = guild.roles.cache.find(role => role.name === PRE_MEMBER_ROLE_NAME);
    if (preMemberRole && member.roles.cache.has(preMemberRole.id)) {
      await member.roles.remove(preMemberRole);
      logger.info(`Removed Pre-Member role from ${interaction.user.username}`);
    }

    let memberRole = guild.roles.cache.find(role => role.name === MEMBER_ROLE_NAME);
    
    if (!memberRole) {
      memberRole = await guild.roles.create({
        name: MEMBER_ROLE_NAME,
        color: 0x5865F2,
        reason: 'Auto-created Member role'
      });
      logger.info('Created Member role');
    }

    await member.roles.add(memberRole);
    logger.info(`Added Member role to ${interaction.user.username}`);

    await interaction.editReply({
      content: '✅ Thank you for agreeing to the rules! You now have full access to the server. Welcome to Azure Community! 🎉'
    });

    const originalMessage = await interaction.message.fetch();
    const updatedRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('agree_rules')
          .setLabel('Rules Agreed ✓')
          .setStyle(ButtonStyle.Success)
          .setDisabled(true)
      );
    
    await originalMessage.edit({ components: [updatedRow] });

  } catch (error) {
    logger.error('Error handling rules agreement', error);
    await interaction.editReply({
      content: '❌ There was an error processing your agreement. Please try again or contact an administrator.'
    });
  }
}

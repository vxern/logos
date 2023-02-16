import {
	ApplicationCommandFlags,
	Bot,
	Channel,
	ChannelTypes,
	Embed,
	Guild,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import { getProficiencyCategory } from 'logos/src/commands/social/module.ts';
import { Client } from 'logos/src/client.ts';
import { getGuildIconURLFormatted, snowflakeToTimestamp } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { mention, MentionTypes, timestamp } from 'logos/formatting.ts';
import { defaultLanguage } from 'logos/types.ts';

/** Displays information about the guild that this command was executed in. */
function handleDisplayGuildInformation([client, bot]: [Client, Bot], interaction: Interaction): void {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const owner = client.cache.users.get(guild.ownerId);
	if (owner === undefined) return;

	const proficiencyRoleFrequencies = getDistribution(client, guild);
	const isManaged = owner.username !== guild.name;

	const descriptionString = localise(Commands.information.options.guild.strings.fields.description, interaction.locale);
	const membersString = localise(Commands.information.options.guild.strings.fields.members, interaction.locale);
	const createdString = localise(Commands.information.options.guild.strings.fields.created, interaction.locale);
	const channelsString = localise(Commands.information.options.guild.strings.fields.channels, interaction.locale);
	const ownerString = localise(Commands.information.options.guild.strings.fields.owner, interaction.locale);
	const moderatorsString = localise(Commands.information.options.guild.strings.fields.moderators, interaction.locale);
	const proficiencyDistributionString = localise(
		Commands.information.options.guild.strings.fields.distributionOfMembersLanguageProficiency,
		interaction.locale,
	);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					thumbnail: getThumbnail(bot, guild),
					title: localise(Commands.information.options.guild.strings.informationAbout, interaction.locale)(guild.name),
					color: constants.colors.invisible,
					fields: [
						{
							name: `${constants.symbols.guild.description} ${descriptionString}`,
							value: guild.description ??
								localise(Commands.information.options.guild.strings.noDescription, interaction.locale),
							inline: true,
						},
						{
							name: `${constants.symbols.guild.members} ${membersString}`,
							value: guild.memberCount.toString(),
							inline: true,
						},
						{
							name: `${constants.symbols.guild.created} ${createdString}`,
							value: timestamp(snowflakeToTimestamp(guild.id)),
							inline: true,
						},
						{
							name: `${constants.symbols.guild.channels.channels} ${channelsString}`,
							value: getChannelInformationSection(guild, interaction.locale),
							inline: true,
						},
						isManaged
							? {
								name: `${constants.symbols.guild.moderators} ${moderatorsString}`,
								value: localise(Commands.information.options.guild.strings.overseenByModerators, interaction.locale)(
									configuration.permissions.moderatorRoleNames.main.toLowerCase(),
								),
								inline: false,
							}
							: {
								name: `${constants.symbols.guild.owner} ${ownerString}`,
								value: mention(owner.id, MentionTypes.User),
								inline: true,
							},
						{
							name: `${constants.symbols.guild.proficiencyDistribution} ${proficiencyDistributionString}`,
							value: formatDistribution(proficiencyRoleFrequencies, interaction.locale),
							inline: false,
						},
					],
				}],
			},
		},
	);
}

function getChannelInformationSection(guild: Guild, locale: string | undefined): string {
	function getChannelCountByType(channels: Channel[], type: ChannelTypes): number {
		return channels.filter((channel) => channel.type === type).length;
	}

	const channels = guild.channels.array();
	const textChannelsCount = getChannelCountByType(channels, ChannelTypes.GuildText);
	const voiceChannelsCount = getChannelCountByType(channels, ChannelTypes.GuildVoice);

	const textChannelsString = localise(Commands.information.options.guild.strings.channelTypes.text, locale);
	const voiceChannelsString = localise(Commands.information.options.guild.strings.channelTypes.voice, locale);

	return `${constants.symbols.guild.channels.text} ${textChannelsString} – ${textChannelsCount} | ${constants.symbols.guild.channels.voice} ${voiceChannelsString} – ${voiceChannelsCount}`;
}

type ProficiencyRoleDistribution = [withRole: [roleId: bigint, frequency: number][], withoutRole: number];

/** Gets the distribution of proficiency roles of a guild's members. */
function getDistribution(client: Client, guild: Guild): ProficiencyRoleDistribution {
	const proficiencyCategory = getProficiencyCategory();
	const proficiencies = proficiencyCategory.collection.list;
	const proficiencyRoleNames = proficiencies.map((proficiency) => proficiency.name[defaultLanguage]);
	const proficiencyRoles = guild.roles.array()
		.filter((role) => proficiencyRoleNames.includes(role.name))
		.toSorted((a, b) => a.position - b.position);
	const proficiencyRoleIds = proficiencyRoles.map((role) => role.id);

	const members = guild.members.array().filter((member) => !client.cache.users.get(member.id)?.toggles.bot);

	let withoutProficiencyRole = 0;
	const roleFrequencies: Record<`${bigint}`, number> = Object.fromEntries(
		proficiencyRoleIds.map((roleId) => [`${roleId}`, 0]),
	);

	for (const member of members) {
		const roleId = member.roles.filter((roleId) => proficiencyRoleIds.includes(roleId)).at(0);

		if (roleId !== undefined) {
			roleFrequencies[`${roleId}`]++;
		} else {
			withoutProficiencyRole++;
		}
	}

	return [
		Object.entries(roleFrequencies).map(([roleId, frequency]) => [BigInt(roleId), frequency]),
		withoutProficiencyRole,
	];
}

function formatDistribution(distribution: ProficiencyRoleDistribution, locale: string | undefined): string {
	function getPercentageComposition(number: number, total: number): string {
		return ((number / total) * 100).toPrecision(3);
	}

	function formatFrequency(frequency: number, percentage: string, roleMention: string): string {
		return `${frequency} (${percentage}%) ${roleMention}`;
	}

	const [roleFrequencies, withoutRole] = distribution;

	const total = roleFrequencies.map(([_, value]) => value).reduce((a, b) => a + b);

	const strings: string[] = [
		formatFrequency(
			withoutRole,
			getPercentageComposition(withoutRole, total),
			localise(Commands.information.options.guild.strings.withoutProficiencyRole, locale),
		),
	];
	for (const [roleId, frequency] of roleFrequencies) {
		const percentage = getPercentageComposition(frequency, total);
		const roleMention = mention(roleId, MentionTypes.Role);

		strings.unshift(`${frequency} (${percentage}%) ${roleMention}`);
	}

	return strings.join('\n');
}

type Thumbnail = NonNullable<Embed['thumbnail']>;

function getThumbnail(bot: Bot, guild: Guild): Thumbnail | undefined {
	const iconURL = getGuildIconURLFormatted(bot, guild);
	if (iconURL === undefined) return undefined;

	return { url: iconURL };
}

export { handleDisplayGuildInformation };

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
import { getProficiencyCategory } from 'logos/src/commands/social/module.ts';
import { Client, localise } from 'logos/src/client.ts';
import { getGuildIconURLFormatted, snowflakeToTimestamp } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { mention, MentionTypes, timestamp } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';

/** Displays information about the guild that this command was executed in. */
function handleDisplayGuildInformation([client, bot]: [Client, Bot], interaction: Interaction): void {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const owner = client.cache.users.get(guild.ownerId);
	if (owner === undefined) return;

	const proficiencyRoleFrequencies = getDistribution(client, guild);
	const isManaged = owner.username !== guild.name;

	const descriptionString = localise(
		client,
		'information.options.server.strings.fields.description',
		interaction.locale,
	)();
	const membersString = localise(client, 'information.options.server.strings.fields.members', interaction.locale)();
	const createdString = localise(client, 'information.options.server.strings.fields.created', interaction.locale)();
	const channelsString = localise(
		client,
		'information.options.server.strings.fields.channels',
		interaction.locale,
	)();
	const ownerString = localise(client, 'information.options.server.strings.fields.owner', interaction.locale)();
	const moderatorsString = localise(
		client,
		'information.options.server.strings.fields.moderators',
		interaction.locale,
	)();
	const proficiencyDistributionString = localise(
		client,
		'information.options.server.strings.fields.distributionOfMembersLanguageProficiency',
		interaction.locale,
	)();

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
					title: localise(client, 'information.options.server.strings.informationAbout', interaction.locale)(
						{ 'guild_name': guild.name },
					),
					color: constants.colors.invisible,
					fields: [
						{
							name: `${constants.symbols.guild.description} ${descriptionString}`,
							value: guild.description ??
								localise(client, 'information.options.server.strings.noDescription', interaction.locale)(),
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
							value: getChannelInformationSection(client, guild, interaction.locale),
							inline: true,
						},
						isManaged
							? {
								name: `${constants.symbols.guild.moderators} ${moderatorsString}`,
								value: localise(
									client,
									'information.options.server.strings.overseenByModerators',
									interaction.locale,
								)(
									{ 'role_mention': configuration.permissions.moderatorRoleNames.main.toLowerCase() },
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
							value: formatDistribution(client, proficiencyRoleFrequencies, interaction.locale),
							inline: false,
						},
					],
				}],
			},
		},
	);
}

function getChannelInformationSection(client: Client, guild: Guild, locale: string | undefined): string {
	function getChannelCountByType(channels: Channel[], type: ChannelTypes): number {
		return channels.filter((channel) => channel.type === type).length;
	}

	const channels = guild.channels.array();
	const textChannelsCount = getChannelCountByType(channels, ChannelTypes.GuildText);
	const voiceChannelsCount = getChannelCountByType(channels, ChannelTypes.GuildVoice);

	const textChannelsString = localise(client, 'information.options.server.strings.channelTypes.text', locale)();
	const voiceChannelsString = localise(client, 'information.options.server.strings.channelTypes.voice', locale)();

	return `${constants.symbols.guild.channels.text} ${textChannelsString} – ${textChannelsCount}\n` +
		`${constants.symbols.guild.channels.voice} ${voiceChannelsString} – ${voiceChannelsCount}`;
}

type ProficiencyRoleDistribution = [withRole: [roleId: bigint, frequency: number][], withoutRole: number];

/** Gets the distribution of proficiency roles of a guild's members. */
function getDistribution(client: Client, guild: Guild): ProficiencyRoleDistribution {
	const proficiencyCategory = getProficiencyCategory();
	const proficiencies = proficiencyCategory.collection.list;
	const proficiencyRoleNames = proficiencies.map((proficiency) =>
		localise(client, `${proficiency.id}.name`, defaultLocale)()
	);
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

function formatDistribution(
	client: Client,
	distribution: ProficiencyRoleDistribution,
	locale: string | undefined,
): string {
	function getPercentageComposition(number: number, total: number): string {
		return ((number / total) * 100).toPrecision(3);
	}

	function formatFrequency(frequency: number, percentage: string, roleMention: string): string {
		return `${frequency} (${percentage}%) ${roleMention}`;
	}

	const [roleFrequencies, withoutRole] = distribution;

	const total = roleFrequencies.map(([_, value]) => value).reduce((a, b) => a + b, 0);

	const strings: string[] = [
		formatFrequency(
			withoutRole,
			getPercentageComposition(withoutRole, total),
			localise(client, 'information.options.server.strings.withoutProficiencyRole', locale)(),
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

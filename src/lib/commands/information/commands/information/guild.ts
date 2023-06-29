import { Bot, Channel, ChannelTypes, Embed, Guild, Interaction } from "discordeno";
import { proficiency } from "../../../social/roles/categories/language.js";
import { Client, isServicing, localise } from "../../../../client.js";
import { reply } from "../../../../interactions.js";
import { getGuildIconURLFormatted, snowflakeToTimestamp } from "../../../../utils.js";
import constants from "../../../../../constants.js";
import { mention, MentionTypes, timestamp } from "../../../../../formatting.js";

/** Displays information about the guild that this command was executed in. */
async function handleDisplayGuildInformation([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) {
		return;
	}

	const owner = client.cache.users.get(guild.ownerId);
	if (owner === undefined) {
		return;
	}

	const strings = {
		title: localise(
			client,
			"information.options.server.strings.information.title",
			interaction.locale,
		)({ server_name: guild.name }),
		description: {
			description: {
				title: localise(
					client,
					"information.options.server.strings.information.description.description",
					interaction.locale,
				)(),
				noDescription: localise(
					client,
					"information.options.server.strings.information.description.noDescription",
					interaction.locale,
				)(),
			},
			members: localise(
				client,
				"information.options.server.strings.information.description.members",
				interaction.locale,
			)(),
			created: localise(
				client,
				"information.options.server.strings.information.description.created",
				interaction.locale,
			)(),
			channels: localise(
				client,
				"information.options.server.strings.information.description.channels",
				interaction.locale,
			)(),
			owner: localise(client, "information.options.server.strings.information.description.owner", interaction.locale)(),
			moderators: {
				title: localise(
					client,
					"information.options.server.strings.information.description.moderators",
					interaction.locale,
				)(),
				overseenByModerators: localise(
					client,
					"information.options.server.strings.information.description.overseenByModerators",
					interaction.locale,
				)(),
			},
			distribution: localise(
				client,
				"information.options.server.strings.information.description.distribution",
				interaction.locale,
			)(),
		},
	};

	reply([client, bot], interaction, {
		embeds: [
			{
				thumbnail: getThumbnail(bot, guild),
				title: strings.title,
				color: constants.colors.blue,
				fields: [
					{
						name: `${constants.symbols.guild.description} ${strings.description.description.title}`,
						value: guild.description ?? strings.description.description.noDescription,
						inline: true,
					},
					{
						name: `${constants.symbols.guild.members} ${strings.description.members}`,
						value: guild.memberCount.toString(),
						inline: true,
					},
					{
						name: `${constants.symbols.guild.created} ${strings.description.created}`,
						value: timestamp(snowflakeToTimestamp(guild.id)),
						inline: true,
					},
					{
						name: `${constants.symbols.guild.channels.channels} ${strings.description.channels}`,
						value: getChannelInformationSection(client, guild, interaction.locale),
						inline: true,
					},
					...(isServicing(client, guild.id)
						? [
								{
									name: `${constants.symbols.guild.moderators} ${strings.description.moderators.title}`,
									value: strings.description.moderators.overseenByModerators,
									inline: false,
								},
								{
									name: `${constants.symbols.guild.proficiencyDistribution} ${strings.description.distribution}`,
									value: formatDistribution(client, getDistribution(client, guild), interaction.locale),
									inline: false,
								},
						  ]
						: [
								{
									name: `${constants.symbols.guild.owner} ${strings.description.owner}`,
									value: mention(owner.id, MentionTypes.User),
									inline: true,
								},
						  ]),
				],
			},
		],
	});
}

function getChannelInformationSection(client: Client, guild: Guild, locale: string | undefined): string {
	function getChannelCountByType(channels: Channel[], type: ChannelTypes): number {
		return channels.filter((channel) => channel.type === type).length;
	}

	const channels = guild.channels.array();
	const textChannelsCount = getChannelCountByType(channels, ChannelTypes.GuildText);
	const voiceChannelsCount = getChannelCountByType(channels, ChannelTypes.GuildVoice);

	const strings = {
		text: localise(client, "information.options.server.strings.channelTypes.text", locale)(),
		voice: localise(client, "information.options.server.strings.channelTypes.voice", locale)(),
	};

	return `${constants.symbols.guild.channels.text} ${strings.text} – ${textChannelsCount}\n${constants.symbols.guild.channels.voice} ${strings.voice} – ${voiceChannelsCount}`;
}

type ProficiencyRoleDistribution = [withRole: [roleId: bigint, frequency: number][], withoutRole: number];

/** Gets the distribution of proficiency roles of a guild's members. */
function getDistribution(client: Client, guild: Guild): ProficiencyRoleDistribution {
	const guildIdString = guild.id.toString();

	const proficiencyRoleIdsUnsorted = proficiency.collection.list.map((role) => BigInt(role.snowflakes[guildIdString]!));
	const proficiencyRoleIds = proficiencyRoleIdsUnsorted
		.map((roleId) => guild.roles.get(roleId)!)
		.sort((a, b) => a.position - b.position)
		.map((role) => role.id);

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

	const total = roleFrequencies.map(([_, value]) => value).reduce((a, b) => a + b, withoutRole);

	const strings = {
		withoutProficiency: localise(
			client,
			"information.options.server.strings.information.description.withoutProficiency",
			locale,
		)(),
	};

	const stringParts: string[] = [
		formatFrequency(withoutRole, getPercentageComposition(withoutRole, total), strings.withoutProficiency),
	];
	for (const [roleId, frequency] of roleFrequencies) {
		const percentage = getPercentageComposition(frequency, total);
		const roleMention = mention(roleId, MentionTypes.Role);

		stringParts.unshift(`${frequency} (${percentage}%) ${roleMention}`);
	}

	return stringParts.join("\n");
}

type Thumbnail = NonNullable<Embed["thumbnail"]>;

function getThumbnail(bot: Bot, guild: Guild): Thumbnail | undefined {
	const iconURL = getGuildIconURLFormatted(bot, guild);
	if (iconURL === undefined) {
		return undefined;
	}

	return { url: iconURL };
}

export { handleDisplayGuildInformation };

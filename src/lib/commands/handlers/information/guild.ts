import { Locale } from "logos:constants/languages";
import diagnostics from "logos:core/diagnostics";
import { mention, timestamp } from "logos:core/formatting";
import { Client } from "logos/client";
import { Guild } from "logos/database/guild";

/** Displays information about the guild that this command was executed in. */
async function handleDisplayGuildInformation(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const owner = client.entities.users.get(guild.ownerId);
	if (owner === undefined) {
		return;
	}

	const strings = {
		title: client.localise("information.options.server.strings.information.title", locale)({ server_name: guild.name }),
		description: {
			description: {
				title: client.localise("information.options.server.strings.information.description.description", locale)(),
				noDescription: client.localise(
					"information.options.server.strings.information.description.noDescription",
					locale,
				)(),
			},
			members: client.localise("information.options.server.strings.information.description.members", locale)(),
			created: client.localise("information.options.server.strings.information.description.created", locale)(),
			channels: client.localise("information.options.server.strings.information.description.channels", locale)(),
			languages: client.localise("information.options.server.strings.information.description.languages", locale)(),
			owner: client.localise("information.options.server.strings.information.description.owner", locale)(),
			moderators: {
				title: client.localise("information.options.server.strings.information.description.moderators", locale)(),
				overseenByModerators: client.localise(
					"information.options.server.strings.information.description.overseenByModerators",
					locale,
				)(),
			},
			distribution: client.localise(
				"information.options.server.strings.information.description.distribution",
				locale,
			)(),
		},
	};

	await client.notice(interaction, {
		author: {
			iconUrl: Discord.guildIconUrl(guild.id, guild.icon, { size: 4096, format: "png" }),
			name: strings.title,
		},
		fields: [
			{
				name: `${constants.emojis.guild.description} ${strings.description.description.title}`,
				value: guild.description ?? strings.description.description.noDescription,
				inline: true,
			},
			{
				name: `${constants.emojis.guild.members} ${strings.description.members}`,
				value: guild.memberCount.toString(),
				inline: true,
			},
			{
				name: `${constants.emojis.guild.created} ${strings.description.created}`,
				value: timestamp(Discord.snowflakeToTimestamp(guild.id), { format: "relative" }),
				inline: true,
			},
			{
				name: `${constants.emojis.guild.channels.channels} ${strings.description.channels}`,
				value: getChannelInformationSection(client, guild, { locale }),
				inline: true,
			},
			{
				name: `${constants.emojis.guild.languages.languages} ${strings.description.languages}`,
				value: getLanguageInformationSection(client, guildDocument, { locale }),
				inline: true,
			},
			...(guildDocument.isNative
				? [
						{
							name: `${constants.emojis.guild.moderators} ${strings.description.moderators.title}`,
							value: strings.description.moderators.overseenByModerators,
							inline: false,
						},
						{
							name: `${constants.emojis.guild.proficiencyDistribution} ${strings.description.distribution}`,
							value: formatDistribution(client, getProficiencyRoleDistribution(client, guild), { locale }),
							inline: false,
						},
				  ]
				: [
						{
							name: `${constants.emojis.guild.owner} ${strings.description.owner}`,
							value: mention(owner.id, { type: "user" }),
							inline: true,
						},
				  ]),
		],
	});
}

function getChannelInformationSection(client: Client, guild: Logos.Guild, { locale }: { locale: Locale }): string {
	function getChannelCountByType(channels: Logos.Channel[], type: Discord.ChannelTypes): number {
		return channels.filter((channel) => channel.type === type).length;
	}

	const channels = guild.channels.array();
	const textChannelsCount = getChannelCountByType(channels, Discord.ChannelTypes.GuildText);
	const voiceChannelsCount = getChannelCountByType(channels, Discord.ChannelTypes.GuildVoice);

	const strings = {
		text: client.localise("information.options.server.strings.channelTypes.text", locale)(),
		voice: client.localise("information.options.server.strings.channelTypes.voice", locale)(),
	};

	return `${constants.emojis.guild.channels.text} ${strings.text} – ${textChannelsCount}\n${constants.emojis.guild.channels.voice} ${strings.voice} – ${voiceChannelsCount}`;
}

function getLanguageInformationSection(client: Client, guildDocument: Guild, { locale }: { locale: Locale }): string {
	const strings = {
		home: client.localise("information.options.server.strings.languageTypes.home", locale)(),
		target: client.localise("information.options.server.strings.languageTypes.target", locale)(),
		localisationLanguage: client.localise(
			constants.localisations.languages[guildDocument.localisationLanguage],
			locale,
		)(),
		featureLanguage: client.localise(constants.localisations.languages[guildDocument.featureLanguage], locale)(),
	};

	return `${constants.emojis.guild.languages.localisation} ${strings.home} – ${strings.localisationLanguage}\n${constants.emojis.guild.languages.feature} ${strings.target} – ${strings.featureLanguage}`;
}

type ProficiencyRoleDistribution = [withRole: [roleId: bigint, frequency: number][], withoutRole: number];

/** Gets the distribution of proficiency roles of a guild's members. */
function getProficiencyRoleDistribution(client: Client, guild: Logos.Guild): ProficiencyRoleDistribution {
	const guildIdString = guild.id.toString();

	const proficiencyRoleIdsUnsorted = Object.values(constants.roles.language.categories.proficiency.collection.list).map(
		(role) => {
			const snowflake = (role.snowflakes as Record<string, string>)[guildIdString];
			if (snowflake === undefined) {
				throw `StateError: Could not get the snowflake of ${diagnostics.display.role(role.id)}.`;
			}

			return BigInt(snowflake);
		},
	);
	const proficiencyRoleIds = proficiencyRoleIdsUnsorted
		.map((roleId) => {
			const role = guild.roles.get(roleId);
			if (role === undefined) {
				throw `StateError: The ${diagnostics.display.role(roleId)} no longer exists.`;
			}

			return role;
		})
		.sort((a, b) => a.position - b.position)
		.map((role) => role.id);

	const members = guild.members.array().filter((member) => !client.entities.users.get(member.id)?.bot ?? true);

	let withoutProficiencyRole = 0;
	const roleFrequencies: Record<`${bigint}`, number> = Object.fromEntries(
		proficiencyRoleIds.map((roleId) => [`${roleId}`, 0]),
	);

	for (const member of members) {
		const roleId = member.roles.filter((roleId) => proficiencyRoleIds.includes(roleId)).at(0);

		if (roleId !== undefined) {
			roleFrequencies[`${roleId}`] += 1;
		} else {
			withoutProficiencyRole += 1;
		}
	}

	return [
		Object.entries(roleFrequencies).map(([roleId, frequency]) => [BigInt(roleId), frequency]),
		withoutProficiencyRole,
	];
}

function getPercentageComposition(number: number, total: number): string {
	return ((number / total) * 100).toPrecision(3);
}

function formatFrequency(frequency: number, percentage: string, roleMention: string): string {
	return `${frequency} (${percentage}%) ${roleMention}`;
}

function formatDistribution(
	client: Client,
	distribution: ProficiencyRoleDistribution,
	{ locale }: { locale: Locale },
): string {
	const [roleFrequencies, withoutRole] = distribution;

	const total = roleFrequencies.map(([_, value]) => value).reduce((a, b) => a + b, withoutRole);

	const strings = {
		withoutProficiency: client.localise(
			"information.options.server.strings.information.description.withoutProficiency",
			locale,
		)(),
	};

	const stringParts: string[] = [
		formatFrequency(withoutRole, getPercentageComposition(withoutRole, total), strings.withoutProficiency),
	];
	for (const [roleId, frequency] of roleFrequencies) {
		const percentage = getPercentageComposition(frequency, total);
		const roleMention = mention(roleId, { type: "role" });

		stringParts.unshift(`${frequency} (${percentage}%) ${roleMention}`);
	}

	return stringParts.join("\n");
}

export { handleDisplayGuildInformation };

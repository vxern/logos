import { Commands } from '../../../../../assets/localisations/commands.ts';
import { localise } from '../../../../../assets/localisations/types.ts';
import {
	ApplicationCommandFlags,
	Bot,
	ChannelTypes,
	Guild,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { displayTime, mention, MentionTypes } from '../../../../formatting.ts';
import { defaultLanguage } from '../../../../types.ts';
import { guildAsThumbnail, snowflakeToTimestamp } from '../../../../utils.ts';
import { getProficiencyCategory } from '../../../social/module.ts';

/** Displays information about the guild that this command was executed in. */
function displayGuildInformation(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	const owner = client.cache.users.get(guild.ownerId);
	if (!owner) return;

	const hasDistinctOwner = owner && owner.username !== guild.name;

	const proficiencyRoleFrequencies = getProficiencyRoleFrequencies(
		client,
		guild,
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
					thumbnail: guildAsThumbnail(bot, guild),
					title: localise(
						Commands.information.options.guild.strings.informationAbout,
						interaction.locale,
					)(guild.name),
					color: configuration.interactions.responses.colors.invisible,
					fields: [
						{
							name: `🖋️ ${
								localise(
									Commands.information.options.guild.strings.fields.description,
									interaction.locale,
								)
							}`,
							value: guild.description ??
								localise(
									Commands.information.options.guild.strings.noDescription,
									interaction.locale,
								),
							inline: true,
						},
						{
							name: `🧑 ${
								localise(
									Commands.information.options.guild.strings.fields.members,
									interaction.locale,
								)
							}`,
							value: guild.memberCount.toString(),
							inline: true,
						},
						{
							name: `⏱️ ${
								localise(
									Commands.information.options.guild.strings.fields.created,
									interaction.locale,
								)
							}`,
							value: displayTime(snowflakeToTimestamp(guild.id)),
							inline: true,
						},
						{
							name: `🗯️ ${
								localise(
									Commands.information.options.guild.strings.fields.channels,
									interaction.locale,
								)
							}`,
							value: displayInformationAboutChannels(guild, interaction.locale),
							inline: true,
						},
						hasDistinctOwner
							? {
								name: `👑 ${
									localise(
										Commands.information.options.guild.strings.fields
											.serverOwner,
										interaction.locale,
									)
								}`,
								value: mention(owner.id, MentionTypes.User),
								inline: true,
							}
							: ((moderatorRoleName) => ({
								name: `⚖️ ${
									localise(
										Commands.information.options.guild.strings.fields
											.moderators,
										interaction.locale,
									)
								}`,
								value: localise(
									Commands.information.options.guild.strings
										.overseenByModerators,
									interaction.locale,
								)(moderatorRoleName),
								inline: false,
							}))(configuration.guilds.moderation.moderator.toLowerCase()),
						{
							name: `🎓 ${
								localise(
									Commands.information.options.guild.strings.fields
										.proficiencyDistribution,
									interaction.locale,
								)
							}`,
							value: displayProficiencyRoleDistribution(
								proficiencyRoleFrequencies,
								interaction.locale,
							),
							inline: false,
						},
					],
				}],
			},
		},
	);
}

function displayInformationAboutChannels(guild: Guild, locale: string | undefined): string {
	const channels = guild.channels.array();

	const getCountByType = (type: ChannelTypes): number => {
		return channels.filter((channel) => channel.type === type).length;
	};

	const textChannelsCount = getCountByType(ChannelTypes.GuildText);
	const voiceChannelsCount = getCountByType(ChannelTypes.GuildVoice);

	return `📜 ${textChannelsCount} ${
		localise(
			Commands.information.options.guild.strings.channelTypes
				.text,
			locale,
		)
	} | 🔊 ${voiceChannelsCount} ${
		localise(
			Commands.information.options.guild.strings.channelTypes
				.voice,
			locale,
		)
	}`;
}

/**
 * Taking a guild object, gets the distribution of proficiency roles of its members.
 *
 * @param client - The client instance to use.
 * @param guild - The guild of which the role frequencies to get.
 * @returns A map where the keys represent the proficiency role ID, and the values
 * represent the frequency of members that have that role.
 */
function getProficiencyRoleFrequencies(
	client: Client,
	guild: Guild,
): Map<bigint, number> {
	const proficiencyCategory = getProficiencyCategory();
	const proficiencies = proficiencyCategory.collection!.list!;
	const proficiencyNames = proficiencies.map((proficiency) => proficiency.name[defaultLanguage]);
	const proficiencyRoleIds = guild.roles.array().filter((role) => proficiencyNames.includes(role.name)).map((role) =>
		role.id
	);

	const membersIndiscriminate = Array.from(client.cache.members.values());
	const members = membersIndiscriminate.filter((member) =>
		!client.cache.users.get(member.id)?.toggles.bot &&
		member.guildId === guild.id
	);

	const roleFrequencies = new Map<bigint, number>();
	roleFrequencies.set(-1n, 0);
	for (const proficiencyRoleId of proficiencyRoleIds) {
		roleFrequencies.set(proficiencyRoleId, 0);
	}

	for (const member of members) {
		const relevantRoleIds = member.roles.filter((roleId) => proficiencyRoleIds.includes(roleId));

		if (relevantRoleIds.length === 0) {
			relevantRoleIds.push(-1n);
		}

		for (const roleId of relevantRoleIds) {
			roleFrequencies.set(roleId, roleFrequencies.get(roleId)! + 1);
		}
	}

	return roleFrequencies;
}

/**
 * @param proficiencyRoleFrequencies - The frequencies of proficiency roles found
 * in members of a certain guild.
 * @returns A string representation of the proficiency distribution.
 */
function displayProficiencyRoleDistribution(
	proficiencyRoleFrequencies: Map<bigint, number>,
	locale: string | undefined,
): string {
	const total = Array.from(proficiencyRoleFrequencies.values()).reduce((a, b) => a + b);

	const strings: string[] = [];
	for (
		const [roleId, frequency] of Array.from(
			proficiencyRoleFrequencies.entries(),
		)
	) {
		const percentageComposition = getPercentageComposition(frequency, total);
		const roleMention = roleId === -1n
			? localise(
				Commands.information.options.guild.strings.withoutProficiencyRole,
				locale,
			)
			: mention(roleId, MentionTypes.Role);

		strings.push(`${frequency} (${percentageComposition}%) ${roleMention}`);
	}

	strings.reverse();

	return strings.join('\n');
}

/**
 * Taking a number and a total, returns the formatted percentage.
 *
 * @param number - The proportion in relation to the total.
 * @param total - The total number of elements.
 * @returns A string representation of the percentage that the number takes up.
 */
function getPercentageComposition(number: number, total: number): string {
	return ((number / total) * 100).toPrecision(3);
}

export { displayGuildInformation };

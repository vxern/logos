import { Guild, Interaction } from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { mention, MentionType, time } from '../../../../formatting.ts';
import { fetchGuildMembers } from '../../../../utils.ts';
import { getProficiencyCategory } from '../../../roles/module.ts';

/** Displays information about the guild which this command was executed in. */
async function displayGuildInformation(
	_: Client,
	interaction: Interaction,
): Promise<void> {
	const guild = interaction.guild!;

	const owner = (await guild.members.resolve(guild.ownerID!))!;
	const hasDistinctOwner = owner.user.username !== guild.name!;

	interaction.respond({
		embeds: [{
			title: `Information about ${guild.name!}`,
			thumbnail: { url: guild.iconURL() },
			color: configuration.interactions.responses.colors.invisible,
			fields: [
				{
					name: '🖋️ Description',
					value: guild.description ?? 'No description provided.',
					inline: true,
				},
				{
					name: '🧑 Members',
					value: guild.memberCount!.toString(),
					inline: true,
				},
				{
					name: '⏱️ Created',
					value: `${time(guild.timestamp.getTime())}`,
					inline: true,
				},
				{
					name: '🎓 Proficiency Distribution',
					value: await getProficiencyDistribution(guild),
					inline: false,
				},
				hasDistinctOwner
					? {
						name: '👑 Owner',
						value: mention(guild.ownerID!, MentionType.USER),
						inline: true,
					}
					: {
						name: '⚖️ Guides',
						value:
							`This server is overseen by a collective of guides, rather than a single owner.`,
						inline: true,
					},
			],
		}],
		ephemeral: true,
	});
}

/**
 * Taking a guild object, gets a distribution of the proficiencies of its members.
 *
 * @param guild - The guild to get the proficiency distribution for.
 * @returns A formatted string representation of the proficiency distribution.
 */
async function getProficiencyDistribution(guild: Guild): Promise<string> {
	const memberList = await fetchGuildMembers(guild);
	const userMembers = memberList.filter((member) => !member.user.bot);
	const memberRoles = await Promise.all(
		userMembers.map((member) =>
			member.roles.array().then((roles) => roles.map((role) => role.name))
		),
	);

	const proficiencies = getProficiencyCategory().collection!.list!;
	const proficiencyNames = proficiencies.map((proficiency) => proficiency.name);

	const proficiencyDistribution = memberRoles.reduce(
		(distribution, roles) => {
			for (let i = 0; i < proficiencyNames.length; i++) {
				if (roles.includes(proficiencyNames[i]!)) {
					distribution[i] += 1;
				}
			}

			return distribution;
		},
		Array.from(
			{ length: proficiencies.length },
			() => 0,
		),
	);

	const roles = await guild.roles.fetchAll();
	const proficiencyTags = roles
		.filter((role) => proficiencyNames.includes(role.name))
		.map((role) => mention(role.id, MentionType.ROLE));

	return displayProficiencyDistribution(
		proficiencyTags,
		userMembers.length,
		proficiencyDistribution,
	);
}

/**
 * Taking a list of proficiency tags, the number of members and the distribution
 * of members in each corresponding proficiency.
 *
 * @param proficiencyTags - An array of proficiency tags.
 * @param memberCount - The number of members in a guild.
 * @param distribution - Number of members per each proficiency.
 * @returns A string representation of the proficiency distribution.
 */
function displayProficiencyDistribution(
	proficiencyTags: string[],
	memberCount: number,
	distribution: number[],
): string {
	const withoutProficiencyRoleCount = memberCount -
		distribution.reduce((a, b) => a + b, 0);

	distribution.unshift(withoutProficiencyRoleCount);
	proficiencyTags.unshift(`without a proficiency role.`);

	const proficiencyDistributionPrinted = distribution.map(
		(count, index) =>
			`${count} (${getPercentageComposition(count, memberCount)}%) ${
				proficiencyTags[index]
			}`,
	).reverse();

	return proficiencyDistributionPrinted.join('\n');
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

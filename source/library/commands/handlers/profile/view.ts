import { mention } from "logos:core/formatting";
import type { Client } from "logos/client";
import { Praise } from "logos/models/praise";
import { Warning } from "logos/models/warning";

async function handleDisplayProfileAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string }>,
): Promise<void> {
	await client.autocompleteMembers(interaction, { identifier: interaction.parameters.user });
}

async function handleDisplayProfile(
	client: Client,
	interaction: Logos.Interaction<any, { user: string | undefined }>,
): Promise<void> {
	const member = client.resolveInteractionToMember(interaction, {
		identifier: interaction.parameters.user ?? interaction.user.id.toString(),
	});
	if (member === undefined) {
		return;
	}

	const target = member.user;
	if (target === undefined) {
		return;
	}

	const [praiseDocumentsByAuthor, praiseDocumentsByTarget, warningDocuments] = await Promise.all([
		Praise.getAll(client, { where: { guildId: interaction.guildId.toString(), authorId: member.id.toString() } }),
		Praise.getAll(client, { where: { guildId: interaction.guildId.toString(), targetId: member.id.toString() } }),
		Warning.getAll(client, { where: { guildId: interaction.guildId.toString(), targetId: member.id.toString() } }),
	]);

	const strings = constants.contexts.profile({ localise: client.localise.bind(client), locale: interaction.locale });
	const components: Discord.ActionRow[] | undefined = interaction.parameters.show
		? undefined
		: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [client.interactionRepetitionService.getShowButton(interaction)],
				},
			];

	await client.notice(
		interaction,
		{
			title: strings.title({ username: target.username }),
			thumbnail: (() => {
				const iconURL = Discord.avatarUrl(target.id, target.discriminator, {
					avatar: target.avatar,
					size: 4096,
					format: "webp",
				});
				if (iconURL === undefined) {
					return undefined;
				}

				return { url: iconURL };
			})(),
			fields: [
				{
					name: `${constants.emojis.profile.roles} ${strings.roles}`,
					value: member.roles.map((roleId) => mention(roleId, { type: "role" })).join(" "),
					inline: false,
				},
				{
					name: `${constants.emojis.profile.statistics.statistics} ${strings.statistics}`,
					value: `${constants.emojis.profile.statistics.praises} ${strings.praises} • ${strings.received} – ${praiseDocumentsByTarget.length} • ${strings.sent} – ${praiseDocumentsByAuthor.length}
  ${constants.emojis.profile.statistics.warnings} ${strings.warnings} • ${strings.received} – ${warningDocuments.length}`,
					inline: false,
				},
			],
			components,
		},
		{ visible: interaction.parameters.show },
	);
}

export { handleDisplayProfile, handleDisplayProfileAutocomplete };

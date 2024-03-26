import { mention } from "logos:core/formatting";
import { Client } from "logos/client";
import { Praise } from "logos/database/praise";
import { Warning } from "logos/database/warning";

async function handleDisplayProfileAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string }>,
): Promise<void> {
	client.autocompleteMembers(interaction, { identifier: interaction.parameters.user });
}

async function handleDisplayProfile(
	client: Client,
	interaction: Logos.Interaction<any, { user: string | undefined }>,
): Promise<void> {
	const locale = interaction.parameters.show ? interaction.guildLocale : interaction.locale;

	const member = client.resolveInteractionToMember(
		interaction,
		{ identifier: interaction.parameters.user ?? interaction.user.id.toString() },
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	const target = member.user;
	if (target === undefined) {
		return;
	}

	const [praiseDocumentsByAuthor, praiseDocumentsByTarget, warningDocuments] = await Promise.all([
		Praise.getAll(client, { where: { authorId: member.id.toString() } }),
		Praise.getAll(client, { where: { targetId: member.id.toString() } }),
		Warning.getAll(client, { where: { targetId: member.id.toString() } }),
	]);

	const strings = {
		title: client.localise(
			"profile.options.view.strings.information.title",
			locale,
		)({
			username: target.username,
		}),
		roles: client.localise("profile.options.view.strings.information.description.roles", locale)(),
		statistics: client.localise("profile.options.view.strings.information.description.statistics", locale)(),
		praises: client.localise("profile.options.view.strings.information.description.praises", locale)(),
		warnings: client.localise("profile.options.view.strings.information.description.warnings", locale)(),
		received: client.localise("profile.options.view.strings.information.description.received", locale)(),
		sent: client.localise("profile.options.view.strings.information.description.sent", locale)(),
	};

	const components: Discord.ActionRow[] | undefined = interaction.parameters.show
		? undefined
		: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [client.interactionRepetitionService.getShowButton(interaction, { locale })],
				},
		  ];

	await client.notice(
		interaction,
		{
			title: strings.title,
			thumbnail: (() => {
				const iconURL = Discord.avatarUrl(target.id, target.discriminator, {
					avatar: target.avatar,
					size: 4096,
					format: "webp",
				});
				if (iconURL === undefined) {
					return;
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

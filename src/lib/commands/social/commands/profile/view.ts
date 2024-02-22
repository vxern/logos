import * as Discord from "@discordeno/bot";
import constants from "../../../../../constants/constants";
import { MentionTypes, mention } from "../../../../../formatting";
import * as Logos from "../../../../../types";
import { Client } from "../../../../client";
import { Praise } from "../../../../database/praise";
import { Warning } from "../../../../database/warning";
import { OptionTemplate } from "../../../command";
import { show, user } from "../../../parameters";

const command: OptionTemplate = {
	id: "view",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayProfile,
	handleAutocomplete: handleDisplayProfileAutocomplete,
	options: [{ ...user, required: false }, show],
	flags: {
		isShowable: true,
	},
};

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

	client.reply(
		interaction,
		{
			embeds: [
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
					color: constants.colors.peach,
					fields: [
						{
							name: `${constants.symbols.profile.roles} ${strings.roles}`,
							value: member.roles.map((roleId) => mention(roleId, MentionTypes.Role)).join(" "),
							inline: false,
						},
						{
							name: `${constants.symbols.profile.statistics.statistics} ${strings.statistics}`,
							value: `${constants.symbols.profile.statistics.praises} ${strings.praises} • ${strings.received} – ${praiseDocumentsByTarget.length} • ${strings.sent} – ${praiseDocumentsByAuthor.length}
  ${constants.symbols.profile.statistics.warnings} ${strings.warnings} • ${strings.received} – ${warningDocuments.length}`,
							inline: false,
						},
					],
				},
			],
			components,
		},
		{ visible: interaction.parameters.show },
	);
}

export default command;

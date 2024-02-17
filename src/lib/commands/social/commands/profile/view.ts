import * as Discord from "@discordeno/bot";
import constants from "../../../../../constants/constants";
import { MentionTypes, mention } from "../../../../../formatting";
import * as Logos from "../../../../../types";
import { Client } from "../../../../client";
import { Praise } from "../../../../database/praise";
import { Warning } from "../../../../database/warning";
import { getShowButton, parseArguments } from "../../../../interactions";
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

async function handleDisplayProfileAutocomplete(client: Client, interaction: Logos.Interaction): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	client.autocompleteMembers(interaction, { identifier: user });
}

async function handleDisplayProfile(client: Client, interaction: Logos.Interaction): Promise<void> {
	const [{ user, show: showParameter }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const show = interaction.show ?? showParameter ?? false;
	const locale = show ? interaction.guildLocale : interaction.locale;

	const member = client.resolveInteractionToMember(
		interaction,
		{ identifier: user ?? interaction.user.id.toString() },
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

	const showButton = getShowButton(client, interaction, { locale });

	const components: Discord.ActionRow[] | undefined = show
		? undefined
		: [{ type: Discord.MessageComponentTypes.ActionRow, components: [showButton] }];

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
		{ visible: show },
	);
}

export default command;

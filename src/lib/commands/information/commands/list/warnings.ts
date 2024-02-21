import * as Discord from "@discordeno/bot";
import constants from "../../../../../constants/constants";
import { Locale } from "../../../../../constants/languages";
import { timestamp } from "../../../../../formatting";
import * as Logos from "../../../../../types";
import { Client } from "../../../../client";
import { Warning } from "../../../../database/warning";
import { OptionTemplate } from "../../../command";
import { getRuleTitleFormatted, rules } from "../../../moderation/commands/rule";
import { user } from "../../../parameters";

const option: OptionTemplate = {
	id: "warnings",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayWarnings,
	handleAutocomplete: handleDisplayWarningsAutocomplete,
	options: [{ ...user, required: false }],
};

async function handleDisplayWarningsAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string | undefined }>,
): Promise<void> {
	if (interaction.parameters.user === undefined) {
		return;
	}

	const permissions = interaction.member?.permissions;
	if (permissions === undefined) {
		return;
	}

	const isModerator = permissions.has("MODERATE_MEMBERS");

	client.autocompleteMembers(interaction, {
		identifier: interaction.parameters.user,
		options: {
			// Stops normal members from viewing other people's warnings.
			restrictToSelf: !isModerator,
		},
	});
}

async function handleDisplayWarnings(
	client: Client,
	interaction: Logos.Interaction<any, { user: string | undefined }>,
): Promise<void> {
	const locale = interaction.locale;

	const permissions = interaction.member?.permissions;
	if (permissions === undefined) {
		return;
	}

	const isModerator = permissions.has("MODERATE_MEMBERS");

	const member = client.resolveInteractionToMember(
		interaction,
		{
			identifier: interaction.parameters.user ?? interaction.user.id.toString(),
			options: {
				// Stops normal members from viewing other people's warnings.
				restrictToSelf: !isModerator,
			},
		},
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	const isSelf = member.id === interaction.user.id;

	const warningDocuments = await Warning.getAll(client, { where: { targetId: member.id.toString() } });

	client.reply(interaction, {
		embeds: [getWarningPage(client, warningDocuments, isSelf, { locale })],
	});
}

// TODO(vxern): Will be used.
async function displayError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("list.options.warnings.strings.failed.title", locale)(),
		description: client.localise("list.options.warnings.strings.failed.description", locale)(),
	};

	client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			},
		],
	});
}

function getWarningPage(
	client: Client,
	warnings: Warning[],
	isSelf: boolean,
	{ locale }: { locale: Locale },
): Discord.CamelizedDiscordEmbed {
	if (warnings.length === 0) {
		if (isSelf) {
			const strings = {
				title: client.localise("list.options.warnings.strings.noActiveWarnings.title", locale)(),
				description: client.localise("list.options.warnings.strings.noActiveWarnings.description.self", locale)(),
			};

			return {
				title: strings.title,
				description: strings.description,
				color: constants.colors.blue,
			};
		}
		const strings = {
			title: client.localise("list.options.warnings.strings.noActiveWarnings.title", locale)(),
			description: client.localise("list.options.warnings.strings.noActiveWarnings.description.other", locale)(),
		};

		return {
			title: strings.title,
			description: strings.description,
			color: constants.colors.blue,
		};
	}

	const strings = {
		title: client.localise("list.options.warnings.strings.warnings.title", locale)(),
		warning: client.localise("list.options.warnings.strings.warnings.description.warning", locale),
	};

	return {
		title: strings.title,
		fields: warnings.map((warning, index) => {
			const warningString = strings.warning({
				index: index + 1,
				relative_timestamp: timestamp(warning.createdAt),
			});

			const ruleIndex = rules.findIndex((rule) => rule === warning.rule);
			const ruleTitle = getRuleTitleFormatted(client, warning.rule ?? "other", ruleIndex, "option", { locale });

			return { name: warningString, value: `${ruleTitle}\n> *${warning.reason}*` };
		}),
		color: constants.colors.blue,
	};
}

export { getWarningPage, handleDisplayWarnings, handleDisplayWarningsAutocomplete };
export default option;

import constants from "../../../../../constants/constants";
import { Locale } from "../../../../../constants/languages";
import licences from "../../../../../constants/licences";
import { code } from "../../../../../formatting";
import * as Logos from "../../../../../types";
import { Client, localise } from "../../../../client";
import { paginate, parseArguments, reply, respond } from "../../../../interactions";
import { chunk } from "../../../../utils";
import { OptionTemplate } from "../../../command";
import * as Discord from "discordeno";

const command: OptionTemplate = {
	name: "software",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplaySoftwareLicence,
	handleAutocomplete: handleDisplaySoftwareLicenceAutocomplete,
	options: [
		{
			name: "package",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
			autocomplete: true,
		},
	],
};

async function handleDisplaySoftwareLicenceAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const [{ package: packageOrUndefined }] = parseArguments(interaction.data?.options, {});
	const packageQuery = packageOrUndefined ?? "";

	const packageQueryLowercase = packageQuery.toLowerCase();
	const choices = Object.keys(licences.software)
		.map((packageName) => {
			return {
				name: packageName,
				value: packageName,
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(packageQueryLowercase));

	respond([client, bot], interaction, choices);
}

async function handleDisplaySoftwareLicence(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const [{ package: packageOrUndefined }] = parseArguments(interaction.data?.options, {});
	if (packageOrUndefined === undefined) {
		displayError([client, bot], interaction, { locale: interaction.locale });
		return;
	}

	if (!(packageOrUndefined in licences.software)) {
		displayError([client, bot], interaction, { locale: interaction.locale });
		return;
	}

	const packageName = packageOrUndefined as keyof typeof licences.software;
	const licenceParts = chunk(licences.software[packageName], 1);

	const strings = {
		title: localise(client, "license.strings.license", locale)({ entity: code(packageName) }),
	};

	paginate(
		[client, bot],
		interaction,
		{
			elements: licenceParts,
			embed: { color: constants.colors.greenishLightGray },
			view: {
				title: strings.title,
				generate: (page) => {
					if (page.length === 0) {
						return "?";
					}

					return `*${page}*`;
				},
			},
			show: false,
		},
		{ locale },
	);
}

async function displayError(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: localise(client, "license.strings.invalid.title", locale)(),
		description: localise(client, "license.strings.invalid.description", locale)(),
	};

	reply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			},
		],
	});
}

export default command;

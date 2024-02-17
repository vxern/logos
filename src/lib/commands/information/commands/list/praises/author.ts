import * as Discord from "@discordeno/bot";
import constants from "../../../../../../constants/constants";
import { Locale } from "../../../../../../constants/languages";
import * as Logos from "../../../../../../types";
import { Client } from "../../../../../client";
import { Praise } from "../../../../../database/praise";
import { parseArguments } from "../../../../../interactions";
import { OptionTemplate } from "../../../../command";
import { user } from "../../../../parameters";
import { getPraisePage } from "../praises";

const option: OptionTemplate = {
	id: "author",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayPraises,
	handleAutocomplete: handleDisplayPraisesAutocomplete,
	options: [{ ...user, required: false }],
};

async function handleDisplayPraisesAutocomplete(client: Client, interaction: Logos.Interaction): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	client.autocompleteMembers(interaction, { identifier: user });
}

async function handleDisplayPraises(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const [{ user: userQuery }] = parseArguments(interaction.data?.options, {});

	const member = client.resolveInteractionToMember(
		interaction,
		{ identifier: userQuery ?? interaction.user.id.toString() },
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	const user = member.user;
	if (user === undefined) {
		return;
	}

	const isSelf = member.id === interaction.user.id;

	const praiseDocuments = await Praise.getAll(client, { where: { authorId: member.id.toString() } });

	client.reply(interaction, {
		embeds: [getPraisePage(client, praiseDocuments, isSelf, "author", { locale })],
	});
}

async function displayError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("list.options.praises.strings.failed.title", locale)(),
		description: client.localise("list.options.praises.strings.failed.description", locale)(),
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

export default option;

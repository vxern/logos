import { Locale } from "../../../../../../constants/languages";
import { Client } from "../../../../../client";
import { Praise } from "../../../../../database/praise";
import { OptionTemplate } from "../../../../command";
import { user } from "../../../../parameters";
import { getPraisePage } from "../praises";

const option: OptionTemplate = {
	id: "target",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayPraises,
	handleAutocomplete: handleDisplayPraisesAutocomplete,
	options: [{ ...user, required: false }],
};

async function handleDisplayPraisesAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string | undefined }>,
): Promise<void> {
	if (interaction.parameters.user === undefined) {
		return;
	}

	client.autocompleteMembers(interaction, { identifier: interaction.parameters.user });
}

async function handleDisplayPraises(
	client: Client,
	interaction: Logos.Interaction<any, { user: string | undefined }>,
): Promise<void> {
	const locale = interaction.locale;

	const member = client.resolveInteractionToMember(
		interaction,
		{ identifier: interaction.parameters.user ?? interaction.user.id.toString() },
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

	const praiseDocuments = await Praise.getAll(client, { where: { targetId: member.id.toString() } });

	client.reply(interaction, {
		embeds: [getPraisePage(client, praiseDocuments, isSelf, "target", { locale })],
	});
}

// TODO(vxern): Will be used.
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
				color: constants.colours.red,
			},
		],
	});
}

export default option;

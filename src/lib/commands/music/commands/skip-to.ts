import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { getVoiceState, isOccupied, skipTo, verifyCanManagePlayback } from "../../../controllers/music.js";
import { parseArguments, parseTimeExpression, reply, respond } from "../../../interactions.js";
import { OptionTemplate } from "../../command.js";
import { timestamp } from "../../parameters.js";
import { ApplicationCommandOptionTypes, Bot, Interaction } from "discordeno";

const command: OptionTemplate = {
	name: "skip-to",
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleSkipToTimestamp,
	handleAutocomplete: handleSkipToTimestampAutocomplete,
	options: [timestamp],
};

async function handleSkipToTimestampAutocomplete(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ timestamp: timestampExpression }] = parseArguments(interaction.data?.options, {});
	if (timestampExpression === undefined) {
		return;
	}

	const timestamp = parseTimeExpression(client, timestampExpression, interaction.locale);
	if (timestamp === undefined) {
		respond([client, bot], interaction, []);
		return;
	}

	respond([client, bot], interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]);
}

async function handleSkipToTimestamp([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ timestamp: timestampExpression }] = parseArguments(interaction.data?.options, {});

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const controller = client.features.music.controllers.get(guildId);
	if (controller === undefined) {
		return;
	}

	const isVoiceStateVerified = verifyCanManagePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, guildId, interaction.user.id),
	);
	if (!isVoiceStateVerified) {
		return;
	}

	const playingSince = controller.player.playingSince;
	if (playingSince === undefined) {
		return;
	}

	if (!isOccupied(controller.player)) {
		const strings = {
			title: localise(client, "music.options.skip-to.strings.noSong.title", interaction.locale)(),
			description: localise(client, "music.options.skip-to.strings.noSong.description", interaction.locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
		});
		return;
	}

	if (Number.isNaN(timestampExpression)) {
		displayInvalidTimestampError([client, bot], interaction);
		return;
	}

	const timestamp = Number(timestampExpression);

	if (timestamp < 0) {
		skipTo(controller.player, 0);
	} else if (timestamp > playingSince) {
		skipTo(controller.player, playingSince);
	} else {
		skipTo(controller.player, timestamp);
	}

	const strings = {
		title: localise(client, "music.options.skip-to.strings.skippedTo.title", defaultLocale)(),
		description: localise(client, "music.options.skip-to.strings.skippedTo.description", defaultLocale)(),
	};

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.music.skippedTo} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: true },
	);
}

async function displayInvalidTimestampError([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const strings = {
		title: localise(client, "music.options.skip-to.strings.invalidTimestamp.title", interaction.locale)(),
		description: localise(client, "music.options.skip-to.strings.invalidTimestamp.description", interaction.locale)(),
	};

	reply([client, bot], interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.red }],
	});
}

export default command;

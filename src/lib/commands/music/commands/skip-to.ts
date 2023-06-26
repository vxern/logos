import { ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { OptionTemplate } from 'logos/src/lib/commands/command.ts';
import { timestamp } from 'logos/src/lib/commands/parameters.ts';
import { getVoiceState, isOccupied, skipTo, verifyCanManagePlayback } from 'logos/src/lib/controllers/music.ts';
import { Client, localise } from 'logos/src/lib/client.ts';
import { parseArguments, parseTimeExpression, reply, respond } from 'logos/src/lib/interactions.ts';
import constants from 'logos/src/constants.ts';
import { defaultLocale } from 'logos/src/types.ts';

const command: OptionTemplate = {
	name: 'skip-to',
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleSkipToTimestamp,
	handleAutocomplete: handleSkipToTimestampAutocomplete,
	options: [timestamp],
};

function handleSkipToTimestampAutocomplete(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const [{ timestamp: timestampExpression }] = parseArguments(interaction.data?.options, {});

	const timestamp = parseTimeExpression(client, timestampExpression!, interaction.locale);
	if (timestamp === undefined) {
		respond([client, bot], interaction, []);
		return;
	}

	respond([client, bot], interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]);
}

function handleSkipToTimestamp([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ timestamp: timestampExpression }] = parseArguments(interaction.data?.options, {});

	const controller = client.features.music.controllers.get(interaction.guildId!);
	if (controller === undefined) return;

	const isVoiceStateVerified = verifyCanManagePlayback(
		[client, bot],
		interaction,
		controller,
		getVoiceState(client, interaction.guildId!, interaction.user.id),
	);
	if (!isVoiceStateVerified) return;

	const playingSince = controller.player.playingSince!;

	if (!isOccupied(controller.player)) {
		const strings = {
			title: localise(client, 'music.options.skip-to.strings.noSong.title', interaction.locale)(),
			description: localise(client, 'music.options.skip-to.strings.noSong.description', interaction.locale)(),
		};

		return void reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			}],
		});
	}

	if (Number.isNaN(timestampExpression)) {
		return displayInvalidTimestampError([client, bot], interaction);
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
		title: localise(client, 'music.options.skip-to.strings.skippedTo.title', defaultLocale)(),
		description: localise(client, 'music.options.skip-to.strings.skippedTo.description', defaultLocale)(),
	};

	return void reply([client, bot], interaction, {
		embeds: [{
			title: `${constants.symbols.music.skippedTo} ${strings.title}`,
			description: strings.description,
			color: constants.colors.blue,
		}],
	}, { visible: true });
}

function displayInvalidTimestampError([client, bot]: [Client, Bot], interaction: Interaction): void {
	const strings = {
		title: localise(client, 'music.options.skip-to.strings.invalidTimestamp.title', interaction.locale)(),
		description: localise(client, 'music.options.skip-to.strings.invalidTimestamp.description', interaction.locale)(),
	};

	return void reply([client, bot], interaction, {
		embeds: [{ title: strings.title, description: strings.description, color: constants.colors.red }],
	});
}

export default command;

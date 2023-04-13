import { ApplicationCommandOptionTypes, Bot, Interaction } from 'discordeno';
import { OptionTemplate } from 'logos/src/commands/command.ts';
import { timestamp } from 'logos/src/commands/parameters.ts';
import { getVoiceState, isOccupied, skipTo, verifyCanManagePlayback } from 'logos/src/controllers/music.ts';
import { Client, localise } from 'logos/src/client.ts';
import { parseArguments, parseTimeExpression, reply, respond } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionTemplate = {
	name: 'skip-to',
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

	const timestamp = parseTimeExpression(client, timestampExpression!, interaction.locale);
	if (timestamp === undefined) {
		return respond([client, bot], interaction, []);
	}

	return respond([client, bot], interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]);
}

async function handleSkipToTimestamp([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
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

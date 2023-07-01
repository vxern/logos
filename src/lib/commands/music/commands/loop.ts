import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { parseArguments, reply } from "../../../interactions.js";
import { getVoiceState, isCollection, isOccupied, verifyCanManagePlayback } from "../../../services/music/music.js";
import { OptionTemplate } from "../../command.js";
import { collection } from "../../parameters.js";
import { ApplicationCommandOptionTypes, Bot, Interaction } from "discordeno";

const command: OptionTemplate = {
	name: "loop",
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleLoopPlayback,
	options: [collection],
};

async function handleLoopPlayback([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ collection }] = parseArguments(interaction.data?.options, { collection: "boolean" });

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

	const currentListing = controller.currentListing;

	if (collection) {
		if (!isOccupied(controller.player) || currentListing === undefined) {
			const strings = {
				title: localise(client, "music.options.loop.strings.noSongCollection.title", interaction.locale)(),
				description: {
					noSongCollection: localise(
						client,
						"music.options.loop.strings.noSongCollection.description.noSongCollection",
						interaction.locale,
					)(),
				},
			};

			reply([client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description.noSongCollection,
						color: constants.colors.dullYellow,
					},
				],
			});
			return;
		} else if (!isCollection(currentListing.content)) {
			const strings = {
				title: localise(client, "music.options.loop.strings.noSongCollection.title", interaction.locale)(),
				description: {
					noSongCollection: localise(
						client,
						"music.options.loop.strings.noSongCollection.description.noSongCollection",
						interaction.locale,
					)(),
					trySongInstead: localise(
						client,
						"music.options.loop.strings.noSongCollection.description.trySongInstead",
						interaction.locale,
					)(),
				},
			};

			reply([client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: `${strings.description.noSongCollection}\n\n${strings.description.trySongInstead}`,
						color: constants.colors.dullYellow,
					},
				],
			});
			return;
		}
	} else {
		if (!isOccupied(controller.player) || currentListing === undefined) {
			const strings = {
				title: localise(client, "music.options.loop.strings.noSong.title", interaction.locale)(),
				description: localise(client, "music.options.loop.strings.noSong.description", interaction.locale)(),
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
	}

	if (collection) {
		controller.flags.loop.collection = !controller.flags.loop.collection;

		if (!controller.flags.loop.collection) {
			const strings = {
				title: localise(client, "music.options.loop.strings.disabled.title", defaultLocale)(),
				description: localise(
					client,
					"music.options.loop.strings.disabled.description.songCollection",
					defaultLocale,
				)(),
			};

			reply([client, bot], interaction, {
				embeds: [
					{
						title: `${constants.symbols.music.loopDisabled} ${strings.title}`,
						description: strings.description,
						color: constants.colors.blue,
					},
				],
			});
			return;
		}

		const strings = {
			title: localise(client, "music.options.loop.strings.enabled.title", defaultLocale)(),
			description: localise(client, "music.options.loop.strings.enabled.description.songCollection", defaultLocale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: `${constants.symbols.music.loopEnabled} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		});
		return;
	}

	controller.flags.loop.song = !controller.flags.loop.song;

	if (!controller.flags.loop.song) {
		const strings = {
			title: localise(client, "music.options.loop.strings.disabled.title", defaultLocale)(),
			description: localise(client, "music.options.loop.strings.disabled.description.song", defaultLocale)(),
		};

		reply(
			[client, bot],
			interaction,
			{
				embeds: [
					{
						title: `${constants.symbols.music.loopDisabled} ${strings.title}`,
						description: strings.description,
						color: constants.colors.blue,
					},
				],
			},
			{ visible: true },
		);
		return;
	}

	const strings = {
		title: localise(client, "music.options.loop.strings.enabled.title", defaultLocale)(),
		description: localise(client, "music.options.loop.strings.enabled.description.song", defaultLocale)(),
	};

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.music.loopEnabled} ${strings.title}`,
					description: strings.description,
					color: constants.colors.blue,
				},
			],
		},
		{ visible: true },
	);
}

export default command;

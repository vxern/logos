import { Client } from "logos/client";

async function handleDisplayVolume(
	client: Client,
	interaction: Logos.Interaction<any, { show: boolean | undefined }>,
): Promise<void> {
	const locale = interaction.parameters.show ? interaction.guildLocale : interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const musicService = client.getMusicService(guildId);
	if (musicService === undefined) {
		return;
	}

	const isVoiceStateVerified = musicService.verifyVoiceState(interaction, "check");
	if (!isVoiceStateVerified) {
		return;
	}

	const isOccupied = musicService.isOccupied;
	if (!isOccupied) {
		const locale = interaction.locale;
		const strings = {
			title: client.localise("music.strings.notPlaying.title", locale)(),
			description: {
				toCheck: client.localise("music.strings.notPlaying.description.toCheck", locale)(),
			},
		};

		await client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description.toCheck,
					color: constants.colours.dullYellow,
				},
			],
		});

		return;
	}

	const volume = musicService.volume;

	const strings = {
		title: client.localise("music.options.volume.options.display.strings.volume.title", locale)(),
		description: client.localise("music.options.volume.options.display.strings.volume.description", locale)({ volume }),
	};

	const components: Discord.ActionRow[] | undefined = interaction.parameters.show
		? undefined
		: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [client.interactionRepetitionService.getShowButton(interaction, { locale })],
				},
		  ];

	await client.reply(
		interaction,
		{
			embeds: [
				{
					title: `${constants.emojis.music.volume} ${strings.title}`,
					description: strings.description,
					color: constants.colours.blue,
				},
			],
			components,
		},
		{ visible: interaction.parameters.show },
	);
}

export { handleDisplayVolume };

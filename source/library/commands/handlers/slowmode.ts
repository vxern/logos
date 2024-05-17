import { getSlowmodeDelayByLevel, getSlowmodeLevelByDelay, isValidSlowmodeLevel } from "logos:constants/slowmode";
import { timestamp } from "logos:core/formatting";
import { Client } from "logos/client";
import { Guild } from "logos/database/guild";

const lastUseByGuildId = new Map<bigint, number>();

async function handleToggleSlowmodeAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { level: string }>,
): Promise<void> {
	const strings = constants.contexts.slowmodeLevel({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});
	const levelLowercase = interaction.parameters.level.trim().toLowerCase();
	const choices = constants.slowmode.levels
		.map((level) => ({ name: strings.level(level), value: level }))
		.filter((choice) => choice.name.toLowerCase().includes(levelLowercase));

	await client.respond(interaction, choices);
}

async function handleToggleSlowmode(
	client: Client,
	interaction: Logos.Interaction<any, { level: string | undefined }>,
): Promise<void> {
	if (interaction.parameters.level !== undefined && !isValidSlowmodeLevel(interaction.parameters.level)) {
		const strings = constants.contexts.invalidSlowmodeLevel({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});
		await client.error(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const [guild, channel] = [
		client.entities.guilds.get(interaction.guildId),
		client.entities.channels.get(interaction.channelId),
	];
	if (guild === undefined || channel === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const configuration = guildDocument.slowmode;
	if (configuration === undefined) {
		return;
	}

	const isEnabled = channel.rateLimitPerUser !== undefined && channel.rateLimitPerUser !== 0;
	if (isEnabled) {
		if (interaction.parameters.level !== undefined) {
			const previousRateLimitDuration = channel.rateLimitPerUser ?? 0;
			const newRateLimitDuration = getSlowmodeDelayByLevel(interaction.parameters.level);

			const previousLevel = getSlowmodeLevelByDelay(previousRateLimitDuration) ?? "lowest";

			if (newRateLimitDuration < previousRateLimitDuration) {
				client.bot.helpers
					.editChannel(channel.id, { rateLimitPerUser: newRateLimitDuration })
					.catch(() =>
						client.log.warn(
							`Failed to downgrade slowmode level on ${client.diagnostics.channel(channel)}.`,
						),
					);

				await client.tryLog("slowmodeDowngrade", {
					guildId: guild.id,
					journalling: configuration.journaling,
					args: [interaction.user, channel, previousLevel, interaction.parameters.level],
				});

				const strings = constants.contexts.slowmodeDowngraded({
					localise: client.localise.bind(client),
					locale: interaction.guildLocale,
				});
				await client.success(
					interaction,
					{
						title: `${constants.emojis.events.slowmode.downgraded}  ${strings.title}`,
						description: strings.description,
					},
					{ visible: true },
				);

				return;
			}

			if (newRateLimitDuration > previousRateLimitDuration) {
				client.bot.helpers
					.editChannel(channel.id, { rateLimitPerUser: newRateLimitDuration })
					.catch(() =>
						client.log.warn(`Failed to upgrade slowmode level on ${client.diagnostics.channel(channel)}.`),
					);

				await client.tryLog("slowmodeUpgrade", {
					guildId: guild.id,
					journalling: configuration.journaling,
					args: [interaction.user, channel, previousLevel, interaction.parameters.level],
				});

				const strings = constants.contexts.slowmodeUpgraded({
					localise: client.localise.bind(client),
					locale: interaction.guildLocale,
				});
				await client.success(
					interaction,
					{
						title: `${constants.emojis.events.slowmode.upgraded}  ${strings.title}`,
						description: strings.description,
					},
					{ visible: true },
				);

				return;
			}

			{
				const strings = constants.contexts.theSameSlowmodeLevel({
					localise: client.localise.bind(client),
					locale: interaction.locale,
				});
				await client.warning(interaction, {
					title: strings.title,
					description: `${strings.description.theSame}\n\n${strings.description.chooseDifferent}`,
				});
			}

			return;
		}

		const lastUse = lastUseByGuildId.get(interaction.guildId);
		if (lastUse !== undefined) {
			const now = Date.now();
			const timeElapsedSinceUse = now - lastUse;
			if (timeElapsedSinceUse < constants.SLOWMODE_COLLISION_TIMEOUT) {
				const canDisableIn = now + (constants.SLOWMODE_COLLISION_TIMEOUT - timeElapsedSinceUse);

				const strings = constants.contexts.slowmodeTooSoon({
					localise: client.localise.bind(client),
					locale: interaction.locale,
				});
				await client.pushback(interaction, {
					title: strings.title,
					description: `${strings.description.justEnabled} ${strings.description.canDisableIn({
						relative_timestamp: timestamp(canDisableIn, { format: "relative" }),
					})}`,
				});

				return;
			}
		}

		client.bot.helpers
			.editChannel(channel.id, { rateLimitPerUser: null })
			.catch(() => client.log.warn(`Failed to disable slowmode on ${client.diagnostics.channel(channel)}.`));

		await client.tryLog("slowmodeDisable", {
			guildId: guild.id,
			journalling: configuration.journaling,
			args: [interaction.user, channel],
		});

		const strings = constants.contexts.slowmodeDisabled({
			localise: client.localise.bind(client),
			locale: interaction.guildLocale,
		});
		await client.notice(
			interaction,
			{
				title: `${constants.emojis.events.slowmode.disabled}  ${strings.title}`,
				description: strings.description,
			},
			{ visible: true },
		);

		return;
	}

	lastUseByGuildId.set(guild.id, Date.now());

	client.bot.helpers
		.editChannel(channel.id, {
			rateLimitPerUser: getSlowmodeDelayByLevel(interaction.parameters.level ?? "lowest"),
		})
		.catch((reason) =>
			client.log.warn(`Failed to enable slowmode on ${client.diagnostics.channel(channel)}.`, reason),
		);

	await client.tryLog("slowmodeEnable", {
		guildId: guild.id,
		journalling: configuration.journaling,
		args: [interaction.user, channel, interaction.parameters.level ?? "lowest"],
	});

	const strings = constants.contexts.slowmodeEnabled({
		localise: client.localise.bind(client),
		locale: interaction.guildLocale,
	});
	await client.notice(
		interaction,
		{
			title: `${constants.emojis.events.slowmode.enabled}  ${strings.title}`,
			description: strings.description,
		},
		{ visible: true },
	);
}

export { handleToggleSlowmode, handleToggleSlowmodeAutocomplete };

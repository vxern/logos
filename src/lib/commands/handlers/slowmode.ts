import { getSlowmodeDelayByLevel, getSlowmodeLevelByDelay, isValidSlowmodeLevel } from "logos:constants/slowmode";
import diagnostics from "logos:core/diagnostics";
import { timestamp } from "logos:core/formatting";
import { Client } from "logos/client";
import { Guild } from "logos/database/guild";

const lastUseByGuildId = new Map<bigint, number>();

async function handleToggleSlowmodeAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { level: string }>,
): Promise<void> {
	const locale = interaction.locale;

	const levelLowercase = interaction.parameters.level.trim().toLowerCase();
	const choices = constants.slowmode.levels
		.map((level, index) => {
			return {
				name: client.localise(`slowmode.strings.levels.${level}`, locale)(),
				value: index.toString(),
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(levelLowercase));

	await client.respond(interaction, choices);
}

async function handleToggleSlowmode(
	client: Client,
	interaction: Logos.Interaction<any, { level: string | undefined }>,
): Promise<void> {
	const locale = interaction.guildLocale;

	if (interaction.parameters.level !== undefined && !isValidSlowmodeLevel(interaction.parameters.level)) {
		const strings = {
			title: client.localise("slowmode.strings.invalid.title", locale)(),
			description: client.localise("slowmode.strings.invalid.description", locale)(),
		};

		await client.error(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const { guildId, channelId } = interaction;
	if (guildId === undefined || channelId === undefined) {
		return;
	}

	const [guild, channel] = [client.entities.guilds.get(guildId), client.entities.channels.get(channelId)];
	if (guild === undefined || channel === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.slowmode;
	if (configuration === undefined) {
		return;
	}

	const isEnabled = channel.rateLimitPerUser !== undefined && channel.rateLimitPerUser !== 0;
	if (isEnabled) {
		if (interaction.parameters.level !== undefined) {
			const previousRateLimitDuration = channel.rateLimitPerUser ?? 0;
			const newRateLimitDuration = Math.floor(getSlowmodeDelayByLevel(interaction.parameters.level) / 1000);

			const previousLevel = getSlowmodeLevelByDelay(previousRateLimitDuration) ?? "lowest";

			if (newRateLimitDuration < previousRateLimitDuration) {
				client.bot.rest
					.editChannel(channel.id, { rateLimitPerUser: newRateLimitDuration })
					.catch(() =>
						client.log.warn(`Failed to downgrade slowmode level on ${diagnostics.display.channel(channel)}.`),
					);

				await client.tryLog("slowmodeDowngrade", {
					guildId: guild.id,
					journalling: configuration.journaling,
					args: [interaction.user, channel, previousLevel, interaction.parameters.level],
				});

				const strings = {
					title: client.localise("slowmode.strings.downgraded.title", locale)(),
					description: client.localise("slowmode.strings.downgraded.description", locale)(),
				};

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
				client.bot.rest
					.editChannel(channel.id, { rateLimitPerUser: newRateLimitDuration })
					.catch(() => client.log.warn(`Failed to upgrade slowmode level on ${diagnostics.display.channel(channel)}.`));

				await client.tryLog("slowmodeUpgrade", {
					guildId: guild.id,
					journalling: configuration.journaling,
					args: [interaction.user, channel, previousLevel, interaction.parameters.level],
				});

				const strings = {
					title: client.localise("slowmode.strings.upgraded.title", locale)(),
					description: client.localise("slowmode.strings.upgraded.description", locale)(),
				};

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
				const locale = interaction.locale;
				const strings = {
					title: client.localise("slowmode.strings.theSame.title", locale)(),
					description: {
						theSame: client.localise("slowmode.strings.theSame.description.theSame", locale)(),
						chooseDifferent: client.localise("slowmode.strings.theSame.description.chooseDifferent", locale)(),
					},
				};

				await client.warning(interaction, {
					title: strings.title,
					description: `${strings.description.theSame}\n\n${strings.description.chooseDifferent}`,
				});
			}

			return;
		}

		const lastUse = lastUseByGuildId.get(guildId);
		if (lastUse !== undefined) {
			const now = Date.now();
			const timeElapsedSinceUse = now - lastUse;
			if (timeElapsedSinceUse < constants.SLOWMODE_COLLISION_TIMEOUT) {
				const canDisableIn = now + (constants.SLOWMODE_COLLISION_TIMEOUT - timeElapsedSinceUse);

				const locale = interaction.locale;
				const strings = {
					title: client.localise("slowmode.strings.tooSoon.title", locale)(),
					description: {
						justEnabled: client.localise("slowmode.strings.tooSoon.description.justEnabled", locale)(),
						canDisableIn: client.localise(
							"slowmode.strings.tooSoon.description.canDisableIn",
							locale,
						)({ relative_timestamp: timestamp(canDisableIn, { format: "relative" }) }),
					},
				};

				await client.pushback(interaction, {
					title: strings.title,
					description: `${strings.description.justEnabled} ${strings.description.canDisableIn}`,
				});

				return;
			}
		}

		client.bot.rest
			.editChannel(channel.id, { rateLimitPerUser: null })
			.catch(() => client.log.warn(`Failed to disable slowmode on ${diagnostics.display.channel(channel)}.`));

		await client.tryLog("slowmodeDisable", {
			guildId: guild.id,
			journalling: configuration.journaling,
			args: [interaction.user, channel],
		});

		const strings = {
			title: client.localise("slowmode.strings.disabled.title", locale)(),
			description: client.localise("slowmode.strings.disabled.description", locale)(),
		};

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

	client.bot.rest
		.editChannel(channel.id, { rateLimitPerUser: getSlowmodeDelayByLevel(interaction.parameters.level ?? "lowest") })
		.catch((reason) =>
			client.log.warn(`Failed to enable slowmode on ${diagnostics.display.channel(channel)}: ${reason}`),
		);

	await client.tryLog("slowmodeEnable", {
		guildId: guild.id,
		journalling: configuration.journaling,
		args: [interaction.user, channel, interaction.parameters.level ?? "lowest"],
	});

	const strings = {
		title: client.localise("slowmode.strings.enabled.title", locale)(),
		description: client.localise("slowmode.strings.enabled.description", locale)(),
	};

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

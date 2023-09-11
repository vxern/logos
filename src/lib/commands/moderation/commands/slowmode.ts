import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import time from "../../../../constants/time";
import { TimestampFormat, timestamp } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import diagnostics from "../../../diagnostics";
import { parseArguments, reply, respond } from "../../../interactions";
import { CommandTemplate } from "../../command";

const command: CommandTemplate = {
	name: "slowmode",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["MODERATE_MEMBERS"],
	handle: handleToggleSlowmode,
	handleAutocomplete: handleToggleSlowmodeAutocomplete,
	options: [
		{
			name: "level",
			type: Discord.ApplicationCommandOptionTypes.String,
			autocomplete: true,
		},
	],
};

const lastUseByGuildId = new Map<bigint, number>();

const levels = ["lowest", "low", "medium", "high", "highest", "emergency", "lockdown", "beyond"] as const;

// In milliseconds
const rateLimitDurationByLevel: Record<typeof levels[number], number> = {
	lowest: time.second * 5,
	low: time.second * 10,
	medium: time.second * 30,
	high: time.minute * 1,
	highest: time.minute * 5,
	emergency: time.minute * 20,
	lockdown: time.hour * 1,
	beyond: time.day * 1,
};
type SlowmodeLevel = keyof typeof rateLimitDurationByLevel | "unknown";

async function handleToggleSlowmodeAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const [{ level: levelOrUndefined }] = parseArguments(interaction.data?.options, {});
	const levelQuery = levelOrUndefined ?? "";

	const levelQueryLowercase = levelQuery.toLowerCase();
	const choices = levels
		.map((level, index) => {
			return {
				name: localise(client, `slowmode.strings.levels.${level}`, locale)(),
				value: index.toString(),
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(levelQueryLowercase));

	respond([client, bot], interaction, choices);
}

async function handleToggleSlowmode(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.guildLocale;

	const [{ level: levelIndex }] = parseArguments(interaction.data?.options, { level: "number" });

	const { guildId, channelId } = interaction;
	if (guildId === undefined || channelId === undefined) {
		return;
	}

	const [guild, channel] = [client.cache.guilds.get(guildId), client.cache.channels.get(channelId)];
	if (guild === undefined || channel === undefined) {
		return;
	}

	const guildDocument = await client.database.adapters.guilds.getOrFetchOrCreate(
		client,
		"id",
		guild.id.toString(),
		guild.id,
	);
	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.data.features.moderation.features?.slowmode;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const journallingService = client.services.journalling.get(guild.id);

	const isEnabled = channel.rateLimitPerUser !== undefined && channel.rateLimitPerUser !== 0;
	if (isEnabled) {
		if (levelIndex !== undefined) {
			const previousLevel = (Object.entries(rateLimitDurationByLevel).find(
				([_, duration]) => duration === channel.rateLimitPerUser ?? 0,
			)?.[0] ?? "unknown") as SlowmodeLevel;

			const level = levels.at(levelIndex);
			if (level === undefined) {
				const strings = {
					title: localise(client, "slowmode.strings.invalid.title", locale)(),
					description: localise(client, "slowmode.strings.invalid.description", locale)(),
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
				return;
			}

			const previousRateLimitDuration = channel.rateLimitPerUser ?? 0;
			const newRateLimitDuration = Math.floor(rateLimitDurationByLevel[level] / 1000);

			if (newRateLimitDuration < previousRateLimitDuration) {
				bot.rest
					.editChannel(channel.id, { rateLimitPerUser: newRateLimitDuration })
					.catch(() =>
						client.log.warn(`Failed to downgrade slowmode level on ${diagnostics.display.channel(channel)}.`),
					);

				if (configuration.journaling) {
					journallingService?.log("slowmodeDowngrade", {
						args: [interaction.user, channel, previousLevel, level],
					});
				}

				const strings = {
					title: localise(client, "slowmode.strings.downgraded.title", locale)(),
					description: localise(client, "slowmode.strings.downgraded.description", locale)(),
				};

				reply(
					[client, bot],
					interaction,
					{
						embeds: [
							{
								title: `${constants.symbols.events.slowmode.downgraded}  ${strings.title}`,
								description: strings.description,
								color: constants.colors.lightGreen,
							},
						],
					},
					{ visible: true },
				);
				return;
			} else if (newRateLimitDuration > previousRateLimitDuration) {
				bot.rest
					.editChannel(channel.id, { rateLimitPerUser: newRateLimitDuration })
					.catch(() => client.log.warn(`Failed to upgrade slowmode level on ${diagnostics.display.channel(channel)}.`));

				if (configuration.journaling) {
					journallingService?.log("slowmodeUpgrade", { args: [interaction.user, channel, previousLevel, level] });
				}

				const strings = {
					title: localise(client, "slowmode.strings.upgraded.title", locale)(),
					description: localise(client, "slowmode.strings.upgraded.description", locale)(),
				};

				reply(
					[client, bot],
					interaction,
					{
						embeds: [
							{
								title: `${constants.symbols.events.slowmode.upgraded}  ${strings.title}`,
								description: strings.description,
								color: constants.colors.lightGreen,
							},
						],
					},
					{ visible: true },
				);
				return;
			} else {
				const locale = interaction.locale;
				const strings = {
					title: localise(client, "slowmode.strings.theSame.title", locale)(),
					description: {
						theSame: localise(client, "slowmode.strings.theSame.description.theSame", locale)(),
						chooseDifferent: localise(client, "slowmode.strings.theSame.description.chooseDifferent", locale)(),
					},
				};

				reply([client, bot], interaction, {
					embeds: [
						{
							title: strings.title,
							description: `${strings.description.theSame}\n\n${strings.description.chooseDifferent}`,
							color: constants.colors.dullYellow,
						},
					],
				});
				return;
			}
		} else {
			const lastUse = lastUseByGuildId.get(guildId);
			if (lastUse !== undefined) {
				const timeElapsedSinceUse = Date.now() - lastUse;
				if (timeElapsedSinceUse < constants.SLOWMODE_COLLISION_TIMEOUT) {
					const canDisableIn = Date.now() + (timeElapsedSinceUse - constants.SLOWMODE_COLLISION_TIMEOUT);

					const locale = interaction.locale;
					const strings = {
						title: localise(client, "slowmode.strings.tooSoon.title", locale)(),
						description: {
							justEnabled: localise(client, "slowmode.strings.tooSoon.description.justEnabled", locale)(),
							canDisableIn: localise(
								client,
								"slowmode.strings.tooSoon.description.canDisableIn",
								locale,
							)({ relative_timestamp: timestamp(canDisableIn, TimestampFormat.Relative) }),
						},
					};

					reply([client, bot], interaction, {
						embeds: [
							{
								title: strings.title,
								description: `${strings.description.justEnabled} ${strings.description.canDisableIn}`,
								color: constants.colors.peach,
							},
						],
					});
					return;
				}
			}
		}

		bot.rest
			.editChannel(channel.id, { rateLimitPerUser: null })
			.catch(() => client.log.warn(`Failed to disable slowmode on ${diagnostics.display.channel(channel)}.`));

		if (configuration.journaling) {
			journallingService?.log("slowmodeDisable", { args: [interaction.user, channel] });
		}

		const strings = {
			title: localise(client, "slowmode.strings.disabled.title", locale)(),
			description: localise(client, "slowmode.strings.disabled.description", locale)(),
		};

		reply(
			[client, bot],
			interaction,
			{
				embeds: [
					{
						title: `${constants.symbols.events.slowmode.disabled}  ${strings.title}`,
						description: strings.description,
						color: constants.colors.dullYellow,
					},
				],
			},
			{ visible: true },
		);
		return;
	}

	if (levelIndex === undefined) {
		const locale = interaction.locale;
		const strings = {
			title: localise(client, "slowmode.strings.missing.title", locale)(),
			description: localise(client, "slowmode.strings.missing.description", locale)({ parameter: "level" }),
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

	const level = levels.at(levelIndex);
	if (level === undefined) {
		const locale = interaction.locale;
		const strings = {
			title: localise(client, "slowmode.strings.invalid.title", locale)(),
			description: localise(client, "slowmode.strings.invalid.description", locale)(),
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
		return;
	}

	lastUseByGuildId.set(guild.id, Date.now());

	const rateLimitDuration = Math.floor(rateLimitDurationByLevel[level] / 1000);

	bot.rest
		.editChannel(channel.id, { rateLimitPerUser: rateLimitDuration })
		.catch(() => client.log.warn(`Failed to enable slowmode on ${diagnostics.display.channel(channel)}.`));

	if (configuration.journaling) {
		journallingService?.log("slowmodeEnable", { args: [interaction.user, channel, level] });
	}

	const strings = {
		title: localise(client, "slowmode.strings.enabled.title", locale)(),
		description: localise(client, "slowmode.strings.enabled.description", locale)(),
	};

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: `${constants.symbols.events.slowmode.enabled}  ${strings.title}`,
					description: strings.description,
					color: constants.colors.lightGreen,
				},
			],
		},
		{ visible: true },
	);
}

export default command;
export type { SlowmodeLevel };

import constants from "../../../../constants/constants";
import time from "../../../../constants/time";
import { TimestampFormat, timestamp } from "../../../../formatting";
import { Client, localise } from "../../../client";
import diagnostics from "../../../diagnostics";
import { parseArguments, reply, respond } from "../../../interactions";
import { CommandTemplate } from "../../command";
import * as Discord from "discordeno";

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
	interaction: Discord.Interaction,
): Promise<void> {
	const [{ level: levelOrUndefined }] = parseArguments(interaction.data?.options, {});
	const levelQuery = levelOrUndefined ?? "";

	const levelQueryLowercase = levelQuery.toLowerCase();
	const choices = levels
		.map((level, index) => {
			return {
				name: localise(client, `slowmode.strings.levels.${level}`, interaction.locale)(),
				value: index.toString(),
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(levelQueryLowercase));

	respond([client, bot], interaction, choices);
}

async function handleToggleSlowmode(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
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
					title: localise(client, "slowmode.strings.invalid.title", interaction.locale)(),
					description: localise(client, "slowmode.strings.invalid.description", interaction.locale)(),
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
				Discord.editChannel(bot, channel.id, { rateLimitPerUser: newRateLimitDuration }).catch(() =>
					client.log.warn(`Failed to downgrade slowmode level on ${diagnostics.display.channel(channel)}.`),
				);

				if (configuration.journaling) {
					journallingService?.log(bot, "slowmodeDowngrade", {
						args: [interaction.user, channel, previousLevel, level],
					});
				}

				const strings = {
					title: localise(client, "slowmode.strings.downgraded.title", interaction.locale)(),
					description: localise(client, "slowmode.strings.downgraded.description", interaction.locale)(),
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
				Discord.editChannel(bot, channel.id, { rateLimitPerUser: newRateLimitDuration }).catch(() =>
					client.log.warn(`Failed to upgrade slowmode level on ${diagnostics.display.channel(channel)}.`),
				);

				if (configuration.journaling) {
					journallingService?.log(bot, "slowmodeUpgrade", { args: [interaction.user, channel, previousLevel, level] });
				}

				const strings = {
					title: localise(client, "slowmode.strings.upgraded.title", interaction.locale)(),
					description: localise(client, "slowmode.strings.upgraded.description", interaction.locale)(),
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
				const strings = {
					title: localise(client, "slowmode.strings.theSame.title", interaction.locale)(),
					description: {
						theSame: localise(client, "slowmode.strings.theSame.description.theSame", interaction.locale)(),
						chooseDifferent: localise(
							client,
							"slowmode.strings.theSame.description.chooseDifferent",
							interaction.locale,
						)(),
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

					const strings = {
						title: localise(client, "slowmode.strings.tooSoon.title", interaction.locale)(),
						description: {
							justEnabled: localise(client, "slowmode.strings.tooSoon.description.justEnabled", interaction.locale)(),
							canDisableIn: localise(
								client,
								"slowmode.strings.tooSoon.description.canDisableIn",
								interaction.locale,
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

		Discord.editChannel(bot, channel.id, { rateLimitPerUser: null }).catch(() =>
			client.log.warn(`Failed to disable slowmode on ${diagnostics.display.channel(channel)}.`),
		);

		if (configuration.journaling) {
			journallingService?.log(bot, "slowmodeDisable", { args: [interaction.user, channel] });
		}

		const strings = {
			title: localise(client, "slowmode.strings.disabled.title", interaction.locale)(),
			description: localise(client, "slowmode.strings.disabled.description", interaction.locale)(),
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
		const strings = {
			title: localise(client, "slowmode.strings.missing.title", interaction.locale)(),
			description: localise(client, "slowmode.strings.missing.description", interaction.locale)({ parameter: "level" }),
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
		const strings = {
			title: localise(client, "slowmode.strings.invalid.title", interaction.locale)(),
			description: localise(client, "slowmode.strings.invalid.description", interaction.locale)(),
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

	Discord.editChannel(bot, channel.id, { rateLimitPerUser: rateLimitDuration }).catch(() =>
		client.log.warn(`Failed to enable slowmode on ${diagnostics.display.channel(channel)}.`),
	);

	if (configuration.journaling) {
		journallingService?.log(bot, "slowmodeEnable", { args: [interaction.user, channel, level] });
	}

	const strings = {
		title: localise(client, "slowmode.strings.enabled.title", interaction.locale)(),
		description: localise(client, "slowmode.strings.enabled.description", interaction.locale)(),
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

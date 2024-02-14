import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import time from "../../../../constants/time";
import { TimestampFormat, timestamp } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { Guild } from "../../../database/guild";
import diagnostics from "../../../diagnostics";
import { parseArguments } from "../../../interactions";
import { CommandTemplate } from "../../command";

const command: CommandTemplate = {
	id: "slowmode",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["MODERATE_MEMBERS"],
	handle: handleToggleSlowmode,
	handleAutocomplete: handleToggleSlowmodeAutocomplete,
	options: [
		{
			id: "level",
			type: Discord.ApplicationCommandOptionTypes.String,
			autocomplete: true,
		},
	],
};

const lastUseByGuildId = new Map<bigint, number>();

const levels = ["lowest", "low", "medium", "high", "highest", "emergency", "lockdown", "beyond"] as const;

// In milliseconds
const rateLimitDurationByLevel: Record<(typeof levels)[number], number> = {
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

async function handleToggleSlowmodeAutocomplete(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const [{ level: levelOrUndefined }] = parseArguments(interaction.data?.options, {});
	const levelQuery = levelOrUndefined ?? "";

	const levelQueryLowercase = levelQuery.toLowerCase();
	const choices = levels
		.map((level, index) => {
			return {
				name: client.localise(`slowmode.strings.levels.${level}`, locale)(),
				value: index.toString(),
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(levelQueryLowercase));

	client.respond(interaction, choices);
}

async function handleToggleSlowmode(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.guildLocale;

	const [{ level: levelIndex }] = parseArguments(interaction.data?.options, { level: "number" });

	const { guildId, channelId } = interaction;
	if (guildId === undefined || channelId === undefined) {
		return;
	}

	const [guild, channel] = [client.entities.guilds.get(guildId), client.entities.channels.get(channelId)];
	if (guild === undefined || channel === undefined) {
		return;
	}

	const session = client.database.openSession();

	const guildDocument =
		client.documents.guilds.get(guildId.toString()) ??
		(await session.get<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));

	session.dispose();

	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.features.moderation.features?.slowmode;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const journallingService = client.getJournallingService(guild.id);

	const isEnabled = channel.rateLimitPerUser !== undefined && channel.rateLimitPerUser !== 0;
	if (isEnabled) {
		if (levelIndex !== undefined) {
			const previousLevel = (Object.entries(rateLimitDurationByLevel).find(
				([_, duration]) => duration === channel.rateLimitPerUser ?? 0,
			)?.[0] ?? "unknown") as SlowmodeLevel;

			const level = levels.at(levelIndex);
			if (level === undefined) {
				const strings = {
					title: client.localise("slowmode.strings.invalid.title", locale)(),
					description: client.localise("slowmode.strings.invalid.description", locale)(),
				};

				client.reply(interaction, {
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
				client.bot.rest
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
					title: client.localise("slowmode.strings.downgraded.title", locale)(),
					description: client.localise("slowmode.strings.downgraded.description", locale)(),
				};

				client.reply(
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
			}

			if (newRateLimitDuration > previousRateLimitDuration) {
				client.bot.rest
					.editChannel(channel.id, { rateLimitPerUser: newRateLimitDuration })
					.catch(() => client.log.warn(`Failed to upgrade slowmode level on ${diagnostics.display.channel(channel)}.`));

				if (configuration.journaling) {
					journallingService?.log("slowmodeUpgrade", { args: [interaction.user, channel, previousLevel, level] });
				}

				const strings = {
					title: client.localise("slowmode.strings.upgraded.title", locale)(),
					description: client.localise("slowmode.strings.upgraded.description", locale)(),
				};

				client.reply(
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

				client.reply(interaction, {
					embeds: [
						{
							title: strings.title,
							description: `${strings.description.theSame}\n\n${strings.description.chooseDifferent}`,
							color: constants.colors.dullYellow,
						},
					],
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
						)({ relative_timestamp: timestamp(canDisableIn, TimestampFormat.Relative) }),
					},
				};

				client.reply(interaction, {
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

		client.bot.rest
			.editChannel(channel.id, { rateLimitPerUser: null })
			.catch(() => client.log.warn(`Failed to disable slowmode on ${diagnostics.display.channel(channel)}.`));

		if (configuration.journaling) {
			journallingService?.log("slowmodeDisable", { args: [interaction.user, channel] });
		}

		const strings = {
			title: client.localise("slowmode.strings.disabled.title", locale)(),
			description: client.localise("slowmode.strings.disabled.description", locale)(),
		};

		client.reply(
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
			title: client.localise("slowmode.strings.missing.title", locale)(),
			description: client.localise("slowmode.strings.missing.description", locale)({ parameter: "level" }),
		};

		client.reply(interaction, {
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
			title: client.localise("slowmode.strings.invalid.title", locale)(),
			description: client.localise("slowmode.strings.invalid.description", locale)(),
		};

		client.reply(interaction, {
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

	client.bot.rest
		.editChannel(channel.id, { rateLimitPerUser: rateLimitDuration })
		.catch((reason) =>
			client.log.warn(`Failed to enable slowmode on ${diagnostics.display.channel(channel)}: ${reason}`),
		);

	if (configuration.journaling) {
		journallingService?.log("slowmodeEnable", { args: [interaction.user, channel, level] });
	}

	const strings = {
		title: client.localise("slowmode.strings.enabled.title", locale)(),
		description: client.localise("slowmode.strings.enabled.description", locale)(),
	};

	client.reply(
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

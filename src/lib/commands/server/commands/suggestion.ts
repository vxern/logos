import constants from "../../../../constants.js";
import defaults from "../../../../defaults.js";
import { trim } from "../../../../formatting.js";
import { Client, localise } from "../../../client.js";
import { stringifyValue } from "../../../database/database.js";
import { timeStructToMilliseconds } from "../../../database/structs/guild.js";
import { Suggestion } from "../../../database/structs/suggestion.js";
import {
	Modal,
	createInteractionCollector,
	createModalComposer,
	deleteReply,
	editReply,
	postponeReply,
	reply,
} from "../../../interactions.js";
import { verifyIsWithinLimits } from "../../../utils.js";
import { CommandTemplate } from "../../command.js";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "suggestion",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleMakeSuggestion,
};

type SuggestionError = "failure";

async function handleMakeSuggestion(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await client.database.adapters.guilds.getOrFetchOrCreate(
		client,
		"id",
		guildId.toString(),
		guildId,
	);
	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.data.features.server.features?.suggestions;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const member = interaction.member;
	if (member === undefined) {
		return;
	}

	const userDocument = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		"id",
		interaction.user.id.toString(),
		interaction.user.id,
	);
	if (userDocument === undefined) {
		return;
	}
	const suggestionsByAuthorAndGuild = client.database.adapters.suggestions.get(client, "authorAndGuild", [
		userDocument.ref,
		guild.id.toString(),
	]);

	const intervalMilliseconds = timeStructToMilliseconds(
		configuration.rateLimit?.within ?? defaults.SUGGESTION_INTERVAL,
	);

	if (suggestionsByAuthorAndGuild !== undefined) {
		const suggestions = Array.from(suggestionsByAuthorAndGuild.values());
		if (
			!verifyIsWithinLimits(
				suggestions,
				configuration.rateLimit?.uses ?? defaults.SUGGESTION_LIMIT,
				intervalMilliseconds,
			)
		) {
			const strings = {
				title: localise(client, "suggestion.strings.tooMany.title", interaction.locale)(),
				description: localise(client, "suggestion.strings.tooMany.description", interaction.locale)(),
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

	const suggestionService = client.services.prompts.suggestions.get(guild.id);
	if (suggestionService === undefined) {
		return;
	}

	createModalComposer<Suggestion["answers"]>([client, bot], interaction, {
		modal: generateSuggestionModal(client, interaction.locale),
		onSubmit: async (submission, answers) => {
			await postponeReply([client, bot], submission);

			const suggestion = await client.database.adapters.suggestions.create(client, {
				createdAt: Date.now(),
				author: userDocument.ref,
				guild: guild.id.toString(),
				answers,
				isResolved: false,
			});
			if (suggestion === undefined) {
				return "failure";
			}

			if (configuration.journaling) {
				const journallingService = client.services.journalling.get(guild.id);
				journallingService?.log(bot, "suggestionSend", { args: [member, suggestion.data] });
			}

			const userId = BigInt(userDocument.data.account.id);
			const reference = stringifyValue(suggestion.ref);

			const user = client.cache.users.get(userId);
			if (user === undefined) {
				return "failure";
			}

			const prompt = await suggestionService.savePrompt(bot, user, suggestion);
			if (prompt === undefined) {
				return "failure";
			}

			suggestionService.registerPrompt(prompt, userId, reference, suggestion);
			suggestionService.registerHandler([userId.toString(), guild.id.toString(), reference]);

			const strings = {
				title: localise(client, "suggestion.strings.sent.title", interaction.locale)(),
				description: localise(client, "suggestion.strings.sent.description", interaction.locale)(),
			};

			editReply([client, bot], submission, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.lightGreen,
					},
				],
			});

			return true;
		},
		onInvalid: async (submission, error) =>
			handleSubmittedInvalidSuggestion([client, bot], submission, error as SuggestionError | undefined),
	});
}

async function handleSubmittedInvalidSuggestion(
	[client, bot]: [Client, Discord.Bot],
	submission: Discord.Interaction,
	error: SuggestionError | undefined,
): Promise<Discord.Interaction | undefined> {
	return new Promise((resolve) => {
		const continueId = createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			onCollect: async (_, selection) => {
				deleteReply([client, bot], submission);
				resolve(selection);
			},
		});

		const cancelId = createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			onCollect: async (_, cancelSelection) => {
				const returnId = createInteractionCollector([client, bot], {
					type: Discord.InteractionTypes.MessageComponent,
					onCollect: (_, returnSelection) => resolve(returnSelection),
				});

				const leaveId = createInteractionCollector([client, bot], {
					type: Discord.InteractionTypes.MessageComponent,
					onCollect: async (_, _leaveSelection) => {
						deleteReply([client, bot], submission);
						deleteReply([client, bot], cancelSelection);
						resolve(undefined);
					},
				});

				const strings = {
					title: localise(client, "suggestion.strings.sureToCancel.title", cancelSelection.locale)(),
					description: localise(client, "suggestion.strings.sureToCancel.description", cancelSelection.locale)(),
					stay: localise(client, "prompts.stay", cancelSelection.locale)(),
					leave: localise(client, "prompts.leave", cancelSelection.locale)(),
				};

				reply([client, bot], cancelSelection, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colors.dullYellow,
						},
					],
					components: [
						{
							type: Discord.MessageComponentTypes.ActionRow,
							components: [
								{
									type: Discord.MessageComponentTypes.Button,
									customId: returnId,
									label: strings.stay,
									style: Discord.ButtonStyles.Success,
								},
								{
									type: Discord.MessageComponentTypes.Button,
									customId: leaveId,
									label: strings.leave,
									style: Discord.ButtonStyles.Danger,
								},
							],
						},
					],
				});
			},
		});

		let embed!: Discord.Embed;
		switch (error) {
			default: {
				const strings = {
					title: localise(client, "suggestion.strings.failed", submission.locale)(),
					description: localise(client, "suggestion.strings.failed", submission.locale)(),
				};

				editReply([client, bot], submission, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colors.dullYellow,
						},
					],
				});

				break;
			}
		}

		const strings = {
			continue: localise(client, "prompts.continue", submission.locale)(),
			cancel: localise(client, "prompts.cancel", submission.locale)(),
		};

		editReply([client, bot], submission, {
			embeds: [embed],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							customId: continueId,
							label: strings.continue,
							style: Discord.ButtonStyles.Success,
						},
						{
							type: Discord.MessageComponentTypes.Button,
							customId: cancelId,
							label: strings.cancel,
							style: Discord.ButtonStyles.Danger,
						},
					],
				},
			],
		});
	});
}

function generateSuggestionModal(client: Client, locale: string | undefined): Modal<Suggestion["answers"]> {
	const strings = {
		title: localise(client, "suggestion.title", locale)(),
		suggestion: localise(client, "suggestion.fields.suggestion", locale)(),
	};

	return {
		title: strings.title,
		fields: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "suggestion",
						type: Discord.MessageComponentTypes.InputText,
						label: trim(strings.suggestion, 45),
						style: Discord.TextStyles.Paragraph,
						required: true,
						minLength: 16,
						maxLength: 256,
					},
				],
			},
		],
	};
}

export default command;
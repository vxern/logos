import {
	ApplicationCommandFlags,
	Bot,
	ButtonStyles,
	deleteOriginalInteractionResponse,
	editOriginalInteractionResponse,
	Embed,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	MessageComponentTypes,
	sendInteractionResponse,
	sendMessage,
	TextStyles,
} from 'discordeno';
import { Commands, createLocalisations, localise, Modals } from 'logos/assets/localisations/mod.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { logEvent } from 'logos/src/controllers/logging/logging.ts';
import {
	authorIdByMessageId,
	getSuggestionPrompt,
	messageIdBySuggestionReferenceId,
	registerSuggestionHandler,
	suggestionByMessageId,
} from 'logos/src/services/suggestions.ts';
import { Client } from 'logos/src/client.ts';
import { stringifyValue } from 'logos/src/database/database.ts';
import { createInteractionCollector, createModalComposer, Modal } from 'logos/src/interactions.ts';
import { getTextChannel, verifyIsWithinLimits } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { trim } from 'logos/formatting.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.suggestion),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: handleMakeSuggestion,
};

enum SuggestionError {
	Failure = 'failure',
}

async function handleMakeSuggestion([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const authorDocument = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		'id',
		interaction.user.id.toString(),
		interaction.user.id,
	);
	if (authorDocument === undefined) return;
	const suggestionsByAuthorAndGuild = client.database.adapters.suggestions.get(
		client,
		'authorAndGuild',
		[authorDocument.ref, guild.id.toString()],
	);

	if (suggestionsByAuthorAndGuild !== undefined) {
		const suggestions = Array.from(suggestionsByAuthorAndGuild.values());
		if (
			!verifyIsWithinLimits(
				suggestions,
				configuration.commands.suggestion.limitUses,
				configuration.commands.suggestion.within,
			)
		) {
			return void sendInteractionResponse(
				bot,
				interaction.id,
				interaction.token,
				{
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							description: localise(Commands.suggestion.strings.waitBeforeSuggesting, interaction.locale),
							color: constants.colors.dullYellow,
						}],
					},
				},
			);
		}
	}

	return void createModalComposer([client, bot], interaction, {
		modal: generateSuggestionModal(interaction.locale),
		onSubmit: async (submission, answers) => {
			await sendInteractionResponse(bot, submission.id, submission.token, {
				type: InteractionResponseTypes.DeferredChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
				},
			});

			const suggestion = await client.database.adapters.suggestions.create(
				client,
				{
					createdAt: Date.now(),
					author: authorDocument.ref,
					guild: guild.id.toString(),
					suggestion: answers.suggestion!,
					isResolved: false,
				},
			);
			if (suggestion === undefined) return SuggestionError.Failure;

			const suggestionChannelId = getTextChannel(guild, configuration.guilds.channels.suggestions)?.id;
			if (suggestionChannelId === undefined) return true;

			logEvent([client, bot], guild, 'suggestionSend', [interaction.member!, suggestion.data]);

			const messageId = await sendMessage(
				bot,
				suggestionChannelId,
				getSuggestionPrompt(bot, guild, interaction.user, suggestion),
			).then((message) => message.id);

			const suggestionReferenceId = stringifyValue(suggestion.ref);

			suggestionByMessageId.set(messageId, suggestion);
			authorIdByMessageId.set(messageId, interaction.user.id);
			messageIdBySuggestionReferenceId.set(suggestionReferenceId, messageId);

			registerSuggestionHandler(
				client,
				guild.id,
				suggestionChannelId,
				[interaction.user.id, authorDocument.ref],
				suggestionReferenceId,
			);

			editOriginalInteractionResponse(bot, submission.token, {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: localise(Commands.suggestion.strings.suggestionSent.header, interaction.locale),
					description: localise(Commands.suggestion.strings.suggestionSent.body, interaction.locale),
					color: constants.colors.lightGreen,
				}],
			});

			return true;
		},
		// deno-lint-ignore require-await
		onInvalid: async (submission, error) =>
			handleSubmittedInvalidSuggestion([client, bot], submission, error as SuggestionError | undefined),
	});
}

function handleSubmittedInvalidSuggestion(
	[client, bot]: [Client, Bot],
	submission: Interaction,
	error: SuggestionError | undefined,
): Promise<Interaction | undefined> {
	return new Promise((resolve) => {
		const continueId = createInteractionCollector([client, bot], {
			type: InteractionTypes.MessageComponent,
			onCollect: (_, selection) => {
				deleteOriginalInteractionResponse(bot, submission.token);
				resolve(selection);
			},
		});

		const cancelId = createInteractionCollector([client, bot], {
			type: InteractionTypes.MessageComponent,
			onCollect: (_, cancelSelection) => {
				const returnId = createInteractionCollector([client, bot], {
					type: InteractionTypes.MessageComponent,
					onCollect: (_, returnSelection) => resolve(returnSelection),
				});

				const leaveId = createInteractionCollector([client, bot], {
					type: InteractionTypes.MessageComponent,
					onCollect: (_, _leaveSelection) => {
						deleteOriginalInteractionResponse(bot, submission.token);
						deleteOriginalInteractionResponse(bot, cancelSelection.token);
						resolve(undefined);
					},
				});

				sendInteractionResponse(bot, cancelSelection.id, cancelSelection.token, {
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							description: localise(Commands.suggestion.strings.areYouSureToStopSubmitting, cancelSelection.locale),
							color: constants.colors.dullYellow,
						}],
						components: [{
							type: MessageComponentTypes.ActionRow,
							components: [{
								type: MessageComponentTypes.Button,
								customId: returnId,
								label: localise(Modals.prompts.noTakeMeBackToTheComposer, cancelSelection.locale),
								style: ButtonStyles.Success,
							}, {
								type: MessageComponentTypes.Button,
								customId: leaveId,
								label: localise(Modals.prompts.yesLeaveTheComposer, cancelSelection.locale),
								style: ButtonStyles.Danger,
							}],
						}],
					},
				});
			},
		});

		let embed!: Embed;
		switch (error) {
			case SuggestionError.Failure:
			default: {
				editOriginalInteractionResponse(bot, submission.token, {
					embeds: [{
						description: localise(Commands.suggestion.strings.failedToSendSuggestion, submission.locale),
						color: constants.colors.dullYellow,
					}],
				});
				break;
			}
		}

		editOriginalInteractionResponse(bot, submission.token, {
			embeds: [embed],
			components: [{
				type: MessageComponentTypes.ActionRow,
				components: [{
					type: MessageComponentTypes.Button,
					customId: continueId,
					label: localise(Modals.prompts.continue, submission.locale),
					style: ButtonStyles.Success,
				}, {
					type: MessageComponentTypes.Button,
					customId: cancelId,
					label: localise(Modals.prompts.cancel, submission.locale),
					style: ButtonStyles.Danger,
				}],
			}],
		});
	});
}

function generateSuggestionModal<T extends string>(locale: string | undefined): Modal<T> {
	return {
		title: localise(Modals.suggestion.title, locale),
		fields: [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				customId: 'suggestion',
				type: MessageComponentTypes.InputText,
				label: trim(localise(Modals.suggestion.fields.suggestion, locale), 45),
				style: TextStyles.Paragraph,
				required: true,
				minLength: 20,
				maxLength: 500,
			}],
		}],
	} as Modal<T>;
}

export default command;

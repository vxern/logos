import { Locale } from "../../../../constants/languages";
import { trim } from "../../../../formatting";
import { Client, InteractionCollector } from "../../../client";
import { Guild } from "../../../database/guild";
import { Suggestion } from "../../../database/suggestion";
import { Modal, createModalComposer } from "../../../interactions";
import { CommandTemplate } from "../../command";

const command: CommandTemplate = {
	id: "suggestion",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleMakeSuggestion,
};

type SuggestionError = "failure";

async function handleMakeSuggestion(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.suggestions;
	if (configuration === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const member = interaction.member;
	if (member === undefined) {
		return;
	}

	const crossesRateLimit = Guild.crossesRateLimit(
		await Suggestion.getAll(client, { where: { authorId: interaction.user.id.toString() } }),
		configuration.rateLimit ?? defaults.SUGGESTION_RATE_LIMIT,
	);
	if (!crossesRateLimit) {
		const strings = {
			title: client.localise("suggestion.strings.tooMany.title", locale)(),
			description: client.localise("suggestion.strings.tooMany.description", locale)(),
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

	const suggestionService = client.getPromptService(guild.id, { type: "suggestions" });
	if (suggestionService === undefined) {
		return;
	}

	createModalComposer<Suggestion["answers"]>(client, interaction, {
		modal: generateSuggestionModal(client, { locale }),
		onSubmit: async (submission, answers) => {
			await client.postponeReply(submission);

			const suggestionDocument = await Suggestion.create(client, {
				guildId: guild.id.toString(),
				authorId: interaction.user.id.toString(),
				answers,
			});

			if (configuration.journaling && guildDocument.isEnabled("journalling")) {
				const journallingService = client.getJournallingService(guild.id);
				journallingService?.logEvent("suggestionSend", { args: [member, suggestionDocument] });
			}

			const user = client.entities.users.get(interaction.user.id);
			if (user === undefined) {
				return "failure";
			}

			const prompt = await suggestionService.savePrompt(user, suggestionDocument);
			if (prompt === undefined) {
				return "failure";
			}

			suggestionService.registerDocument(suggestionDocument);
			suggestionService.registerPrompt(prompt, interaction.user.id, suggestionDocument);
			suggestionService.registerHandler(suggestionDocument);

			const strings = {
				title: client.localise("suggestion.strings.sent.title", locale)(),
				description: client.localise("suggestion.strings.sent.description", locale)(),
			};

			client.editReply(submission, {
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
			handleSubmittedInvalidSuggestion(client, submission, error as SuggestionError | undefined, { locale }),
	});
}

async function handleSubmittedInvalidSuggestion(
	client: Client,
	submission: Logos.Interaction,
	error: SuggestionError | undefined,
	{ locale }: { locale: Locale },
): Promise<Logos.Interaction | undefined> {
	const { promise, resolve } = Promise.withResolvers<Logos.Interaction | undefined>();

	const continueButton = new InteractionCollector(client, { only: [submission.user.id], isSingle: true });
	const cancelButton = new InteractionCollector(client, { only: [submission.user.id] });
	const returnButton = new InteractionCollector(client, {
		only: [submission.user.id],
		isSingle: true,
		dependsOn: cancelButton,
	});
	const leaveButton = new InteractionCollector(client, {
		only: [submission.user.id],
		isSingle: true,
		dependsOn: cancelButton,
	});

	continueButton.onCollect(async (buttonPress) => {
		client.deleteReply(submission);
		resolve(buttonPress);
	});

	cancelButton.onCollect(async (cancelButtonPress) => {
		returnButton.onCollect(async (returnButtonPress) => {
			client.deleteReply(submission);
			client.deleteReply(cancelButtonPress);
			resolve(returnButtonPress);
		});

		leaveButton.onCollect(async (_) => {
			client.deleteReply(submission);
			client.deleteReply(cancelButtonPress);
			resolve(undefined);
		});

		const strings = {
			title: client.localise("suggestion.strings.sureToCancel.title", locale)(),
			description: client.localise("suggestion.strings.sureToCancel.description", locale)(),
			stay: client.localise("prompts.stay", locale)(),
			leave: client.localise("prompts.leave", locale)(),
		};

		client.reply(cancelButtonPress, {
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
							customId: returnButton.customId,
							label: strings.stay,
							style: Discord.ButtonStyles.Success,
						},
						{
							type: Discord.MessageComponentTypes.Button,
							customId: leaveButton.customId,
							label: strings.leave,
							style: Discord.ButtonStyles.Danger,
						},
					],
				},
			],
		});
	});

	client.registerInteractionCollector(continueButton);
	client.registerInteractionCollector(cancelButton);
	client.registerInteractionCollector(returnButton);
	client.registerInteractionCollector(leaveButton);

	let embed!: Discord.CamelizedDiscordEmbed;
	switch (error) {
		default: {
			const strings = {
				title: client.localise("suggestion.strings.failed", locale)(),
				description: client.localise("suggestion.strings.failed", locale)(),
			};

			client.editReply(submission, {
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
		continue: client.localise("prompts.continue", locale)(),
		cancel: client.localise("prompts.cancel", locale)(),
	};

	client.editReply(submission, {
		embeds: [embed],
		components: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						type: Discord.MessageComponentTypes.Button,
						customId: continueButton.customId,
						label: strings.continue,
						style: Discord.ButtonStyles.Success,
					},
					{
						type: Discord.MessageComponentTypes.Button,
						customId: cancelButton.customId,
						label: strings.cancel,
						style: Discord.ButtonStyles.Danger,
					},
				],
			},
		],
	});

	return promise;
}

function generateSuggestionModal(client: Client, { locale }: { locale: Locale }): Modal<Suggestion["answers"]> {
	const strings = {
		title: client.localise("suggestion.title", locale)(),
		suggestion: client.localise("suggestion.fields.suggestion", locale)(),
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

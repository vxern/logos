import { trim } from "../../../../formatting";
import { Client } from "../../../client";
import { Modal, ModalComposer } from "../../../components/modal-composer";
import { Guild } from "../../../database/guild";
import { Suggestion, SuggestionFormData } from "../../../database/suggestion";

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
		configuration.rateLimit ?? constants.defaults.SUGGESTION_RATE_LIMIT,
	);
	if (!crossesRateLimit) {
		const strings = {
			title: client.localise("suggestion.strings.tooMany.title", locale)(),
			description: client.localise("suggestion.strings.tooMany.description", locale)(),
		};

		await client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.dullYellow,
				},
			],
		});

		return;
	}

	const suggestionService = client.getPromptService(guild.id, { type: "suggestions" });
	if (suggestionService === undefined) {
		return;
	}

	const composer = new SuggestionComposer(client, { interaction });

	composer.onSubmit(
		async (
			submission: Logos.Interaction,
			{ locale }: Logos.InteractionLocaleData,
			{ formData }: { formData: SuggestionFormData },
		) => {
			await client.postponeReply(submission);

			const suggestionDocument = await Suggestion.create(client, {
				guildId: guild.id.toString(),
				authorId: interaction.user.id.toString(),
				answers: formData,
			});

			await client.tryLog("suggestionSend", {
				guildId: guild.id,
				journalling: configuration.journaling,
				args: [member, suggestionDocument],
			});

			const user = client.entities.users.get(interaction.user.id);
			if (user === undefined) {
				return;
			}

			const prompt = await suggestionService.savePrompt(user, suggestionDocument);
			if (prompt === undefined) {
				return;
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
						color: constants.colours.lightGreen,
					},
				],
			});
		},
	);

	await composer.open();
}

class SuggestionComposer extends ModalComposer<SuggestionFormData, never> {
	constructor(client: Client, { interaction }: { interaction: Logos.Interaction }) {
		super(client, { interaction, initialFormData: { suggestion: "" } });
	}

	async buildModal(
		_: Logos.Interaction,
		{ locale }: Logos.InteractionLocaleData,
		{ formData }: { formData: SuggestionFormData },
	): Promise<Modal<SuggestionFormData>> {
		const strings = {
			title: this.client.localise("suggestion.title", locale)(),
			fields: {
				suggestion: this.client.localise("suggestion.fields.suggestion", locale)(),
			},
		};

		return {
			title: strings.title,
			elements: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "suggestion",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.suggestion, 45),
							style: Discord.TextStyles.Paragraph,
							required: true,
							value: formData.suggestion,
						},
					],
				},
			],
		};
	}
}

export { handleMakeSuggestion };

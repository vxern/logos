import diagnostics from "logos:core/diagnostics";
import { trim } from "logos:core/formatting";
import { Client } from "logos/client";
import { Modal, ModalComposer } from "logos/commands/components/modal-composer";

type CorrectionMode = "partial" | "full";

async function handleStartCorrecting(
	client: Client,
	interaction: Logos.Interaction,
	{ mode }: { mode: CorrectionMode },
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const member = client.entities.members.get(guildId)?.get(interaction.user.id);
	if (member === undefined) {
		return;
	}

	const message = interaction.data?.resolved?.messages?.array()?.at(0);
	if (message === undefined) {
		return;
	}

	if (message.author.toggles?.has("bot") || message.content.trim().length === 0) {
		const strings = {
			title: client.localise("correction.strings.cannotCorrect.title", locale)(),
			description: client.localise("correction.strings.cannotCorrect.description", locale)(),
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

	if (message.author.id === interaction.user.id) {
		const strings = {
			title: client.localise("correction.strings.cannotCorrectOwn.title", locale)(),
			description: client.localise("correction.strings.cannotCorrectOwn.description", locale)(),
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

	const correctedMember = client.entities.members.get(guildId)?.get(message.author.id);
	if (correctedMember === undefined) {
		return;
	}

	const doNotCorrectMeRoleId = (
		constants.roles.learning.collection.list.doNotCorrectMe.snowflakes as Record<string, string>
	)[guildId.toString()];
	if (doNotCorrectMeRoleId !== undefined) {
		if (correctedMember.roles.some((roleId) => roleId.toString() === doNotCorrectMeRoleId)) {
			const strings = {
				title: client.localise("correction.strings.userDoesNotWantCorrections.title", locale)(),
				description: client.localise("correction.strings.userDoesNotWantCorrections.description", locale)(),
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
	}

	if (message.content.length > constants.MAXIMUM_CORRECTION_MESSAGE_LENGTH) {
		const strings = {
			title: client.localise("correction.strings.tooLong.title", locale)(),
			description: {
				tooLong: client.localise("correction.strings.tooLong.description.tooLong", locale)(),
				maximumLength: client.localise(
					"correction.strings.tooLong.description.maximumLength",
					locale,
				)({ character_limit: constants.MAXIMUM_CORRECTION_MESSAGE_LENGTH }),
			},
		};

		await client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.tooLong} ${strings.description.maximumLength}`,
					color: constants.colours.dullYellow,
				},
			],
		});

		return;
	}

	const composer = new CorrectionComposer(client, { interaction, text: message.content, mode: mode });

	composer.onSubmit(async (submission, { locale }, { formData }) => {
		await client.acknowledge(submission);

		const strings = {
			correction: client.localise("correction.strings.correction", locale)(),
			suggestedBy: client.localise(
				"correction.strings.suggestedBy",
				locale,
			)({ username: diagnostics.display.user(interaction.user, { includeId: false }) }),
		};

		client.bot.rest
			.sendMessage(message.channelId, {
				messageReference: { messageId: message.id, channelId: message.channelId, guildId, failIfNotExists: false },
				embeds: [
					{
						description: formData.corrected,
						color: constants.colours.lightGreen,
						footer: {
							text: `${constants.emojis.correction} ${strings.suggestedBy}`,
							iconUrl: Discord.avatarUrl(interaction.user.id, interaction.user.discriminator, {
								avatar: interaction.user.avatar,
							}),
						},
					},
				],
			})
			.catch(() => client.log.warn(`Failed to send correction to ${diagnostics.display.channel(message.channelId)}.`));
	});

	await composer.open();
}

interface CorrectionFormData {
	readonly original: string;
	readonly corrected: string;
}
type ValidationError = "texts-not-different";
class CorrectionComposer extends ModalComposer<CorrectionFormData, ValidationError> {
	constructor(
		client: Client,
		{ interaction, text, mode }: { interaction: Logos.Interaction; text: string; mode: CorrectionMode },
	) {
		super(client, { interaction, initialFormData: { original: text, corrected: mode === "full" ? text : "" } });
	}

	async buildModal(
		_: Logos.Interaction,
		{ locale }: Logos.InteractionLocaleData,
		{ formData }: { formData: CorrectionFormData },
	): Promise<Modal<CorrectionFormData>> {
		const strings = {
			title: this.client.localise("correction.title", locale)(),
			fields: {
				original: this.client.localise("correction.fields.original", locale)(),
				corrected: this.client.localise("correction.fields.corrected", locale)(),
			},
		};

		return {
			title: strings.title,
			elements: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "original",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.original, 45),
							style: Discord.TextStyles.Paragraph,
							required: false,
							value: formData.original,
						},
					],
				},
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "corrected",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.corrected, 45),
							style: Discord.TextStyles.Paragraph,
							required: true,
							value: formData.corrected,
						},
					],
				},
			],
		};
	}

	async validate({ formData }: { formData: CorrectionFormData }): Promise<ValidationError | undefined> {
		if (formData.corrected === formData.original) {
			return "texts-not-different";
		}

		return undefined;
	}

	getErrorMessage(
		_: Logos.Interaction,
		{ locale }: Logos.InteractionLocaleData,
		{ error }: { error: ValidationError },
	): globalThis.Discord.CamelizedDiscordEmbed | undefined {
		switch (error) {
			case "texts-not-different": {
				const strings = {
					title: this.client.localise("correction.strings.textsNotDifferent.title", locale)(),
					description: this.client.localise("correction.strings.textsNotDifferent.description", locale)(),
				};

				return {
					title: strings.title,
					description: strings.description,
					color: constants.colours.dullYellow,
				};
			}
		}
	}
}

export { handleStartCorrecting };

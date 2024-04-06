import diagnostics from "logos:core/diagnostics";
import { Client } from "logos/client";
import { CorrectionComposer } from "logos/commands/components/modal-composers/correction-composer";
import { InteractionHandler } from "logos/commands/handlers/handler";

type CorrectionMode = "partial" | "full";

const handleMakePartialCorrection: InteractionHandler = (...args) => handleMakeCorrection(...args, { mode: "partial" });
const handleMakeFullCorrection: InteractionHandler = (...args) => handleMakeCorrection(...args, { mode: "full" });

async function handleMakeCorrection(
	client: Client,
	interaction: Logos.Interaction,
	_: Logos.InteractionLocaleData,
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

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	if (message.author.id === interaction.user.id) {
		const strings = {
			title: client.localise("correction.strings.cannotCorrectOwn.title", locale)(),
			description: client.localise("correction.strings.cannotCorrectOwn.description", locale)(),
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
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

			await client.warning(interaction, {
				title: strings.title,
				description: strings.description,
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

		await client.warning(interaction, {
			title: strings.title,
			description: `${strings.description.tooLong} ${strings.description.maximumLength}`,
		});

		return;
	}

	const composer = new CorrectionComposer(client, {
		interaction,
		text: message.content,
		prefillCorrectedField: mode === "full",
	});

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
						color: constants.colours.success,
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

export { handleMakeFullCorrection, handleMakePartialCorrection };

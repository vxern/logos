import {
	ButtonStyles,
	Guild,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	MessageComponentTypes,
	sendInteractionResponse,
	sendMessage,
	User,
} from '../../../deps.ts';
import { Client, getLanguage } from '../../client.ts';
import { getProficiencyCategory } from '../../commands/social/module.ts';
import configuration from '../../configuration.ts';
import { Language } from '../../types.ts';
import {
	createInteractionCollector,
	Form,
	getTextChannel,
	mentionUser,
	toModal,
} from '../../utils.ts';
import { tryAssignRole } from '../../commands/social/data/structures/role.ts';

const proficiencyCategory = getProficiencyCategory();
const proficiencies = proficiencyCategory.collection.list;

async function onSelectLanguageProficiency(
	client: Client,
	interaction: Interaction,
	parameter: string,
): Promise<void> {
	const language = getLanguage(client, interaction.guildId!);
	if (!language) return;

	const languageConfigurationTuples = <[
		Language,
		{ requiresVerification: boolean },
	][]> Object.entries(configuration.guilds.languages);

	const requiresVerification =
		languageConfigurationTuples.find(([key, _configuration]) =>
			key === language
		)![1].requiresVerification;

	if (requiresVerification) {
		const verificationResult = new Promise<boolean>((resolve) => {
			const customId = createInteractionCollector(client, {
				type: InteractionTypes.ModalSubmit,
				userId: interaction.user.id,
				limit: 1,
				onCollect: (bot, submission) => {
					sendInteractionResponse(bot, submission.id, submission.token, {
						type: InteractionResponseTypes.ChannelMessageWithSource,
						data: {
							embeds: [{
								title: 'Answers submitted!',
								description:
									'Your answers to the verification questions have been submitted.\n\nYour request to join the server will be reviewed by a staff member, and you will be notified via DMs when your entry request is accepted.',
								color: configuration.interactions.responses.colors.green,
							}],
						},
					});

					const components = submission?.data?.components;
					if (!components) return;
					if (
						components.some((component) =>
							!component.components || !component.components?.at(0)?.customId
						)
					) {
						return;
					}

					const answers = components.map<[string, string]>(
						(component) => {
							const field = component.components!.at(0)!;

							const fields = Object.entries(
								configuration.interactions.forms.verification.fields,
							);

							const label = fields.find(([name]) =>
								name === field.customId!.split('|')[1]!
							)![1].label;

							const question = typeof label === 'function'
								? label(language)
								: label;

							return [question, field.value!];
						},
					);

					const guild = client.guilds.get(submission.guildId!);
					if (!guild) {
						return;
					}

					verifyUser(
						client,
						guild,
						submission.user,
						answers,
					).then((verificationResult) =>
						resolve(verificationResult)
					);
				},
			});

			sendInteractionResponse(client.bot, interaction.id, interaction.token, {
				type: InteractionResponseTypes.Modal,
				data: toModal(
					<Form> configuration.interactions.forms.verification,
					customId,
					language,
				),
			});
		});

		if (!await verificationResult) return;
	}

	const proficiency = proficiencies[parseInt(parameter)]!;

	return tryAssignRole(
		client,
		interaction,
		proficiencyCategory,
		proficiency,
	);
}

/**
 * Taking a user as a parameter, opens a verification prompt and waits for one
 * of the guides to accept or reject the entry request.
 *
 * @param user - The user to screen.
 * @returns A decision in regards to the user being able to join.
 */
function verifyUser(
	client: Client,
	guild: Guild,
	user: User,
	answers: Array<[string, string]>,
): Promise<boolean> {
	const verificationChannel = getTextChannel(
		guild,
		configuration.guilds.channels.verification,
	)!;

	return new Promise<boolean>((resolve) => {
		const customId = createInteractionCollector(client, {
			type: InteractionTypes.MessageComponent,
			doesNotExpire: true,
			limit: 1,
			onCollect: (_bot, selection) => {
				const customId = selection.data?.customId;
				if (!customId) return;

				const customIdParts = customId.split('|');
				if (customIdParts.length !== 2) return;

				const [_customId, isAcceptedString] = customIdParts;
				const isAccepted = isAcceptedString === 'true';

				client.logging.get(guild.id)?.log(
					isAccepted
						? 'verificationRequestAccept'
						: 'verificationRequestReject',
					user,
					selection.member!,
				);

				resolve(isAccepted);
			},
		});

		sendMessage(client.bot, verificationChannel.id, {
			embeds: [{
				title: mentionUser(user),
				fields: answers.map(([question, answer]) => ({
					name: question,
					value: answer,
				})),
			}],
			components: [{
				type: MessageComponentTypes.ActionRow,
				components: [{
					type: MessageComponentTypes.Button,
					style: ButtonStyles.Success,
					label: 'Accept',
					customId: `${customId}|true`,
				}, {
					type: MessageComponentTypes.Button,
					style: ButtonStyles.Danger,
					label: 'Reject',
					customId: `${customId}|false`,
				}],
			}],
		});
	});
}

export { onSelectLanguageProficiency };

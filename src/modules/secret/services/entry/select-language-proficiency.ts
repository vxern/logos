import { ModalSubmitInteraction } from 'https://raw.githubusercontent.com/vxern/harmony/main/src/structures/modalSubmitInteraction.ts';
import {
	ButtonStyle,
	Guild,
	InteractionType,
	MessageComponentInteraction,
	MessageComponentType,
	User,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import { tryAssignRole } from '../../../../modules/roles/data/structures/role.ts';
import configuration from '../../../../configuration.ts';
import {
	createInteractionCollector,
	Form,
	getTextChannel,
	toModal,
} from '../../../../utils.ts';
import { getProficiencyCategory } from '../../../roles/module.ts';

const proficiencyCategory = getProficiencyCategory();
const proficiencies = proficiencyCategory.collection!.list!;

async function onSelectLanguageProficiency(
	client: Client,
	interaction: MessageComponentInteraction,
	parameter: string,
): Promise<void> {
	const language = client.getLanguage(interaction.guild!);

	const requiresVerification = Object.entries(
		configuration.guilds.languages,
	).find(([key]) => key === language)![1].requiresVerification;

	if (requiresVerification) {
		const [collector, customID] = createInteractionCollector(client, {
			type: InteractionType.MODAL_SUBMIT,
			user: interaction.user,
			limit: 1,
		});

		interaction.showModal(
			toModal(
				<Form> configuration.interactions.forms.verification,
				customID,
				language,
			),
		);

		const submission =
			<ModalSubmitInteraction> (await collector.waitFor('collect'))[0];

		submission.respond({
			embeds: [{
				title: 'Answers submitted!',
				description:
					'Your answers to the verification questions have been submitted.\n\nYour request to join the server will be reviewed by a staff member, and you will be notified via DMs when your entry request is accepted.',
				color: configuration.interactions.responses.colors.green,
			}],
			ephemeral: true,
		});

		const answers = submission.data!.components!.map<[string, string]>(
			(component) => {
				const field = component.components[0]!;

				const fields = Object.entries(
					configuration.interactions.forms.verification.fields,
				);

				const label = fields.find(([name]) =>
					name === field.custom_id.split('|')[1]!
				)![1].label;

				const question = typeof label === 'function' ? label(language) : label;

				return [question, field.value];
			},
		);

		const verificationResult = await verifyUser(
			client,
			submission.guild!,
			submission.user,
			answers,
		);

		if (!verificationResult) return;
	}

	const proficiency = proficiencies[parseInt(parameter)]!;

	tryAssignRole(interaction, language, proficiencyCategory, proficiency);
}

/**
 * Taking a user as a parameter, opens a verification prompt and waits for one
 * of the guides to accept or reject the entry request.
 *
 * @param user - The user to screen.
 * @returns A decision in regards to the user being able to join.
 */
async function verifyUser(
	client: Client,
	guild: Guild,
	user: User,
	answers: Array<[string, string]>,
): Promise<boolean> {
	const verificationChannel = (await getTextChannel(
		guild,
		configuration.guilds.channels.verification,
	))!;

	const [collector, customID] = createInteractionCollector(client, {
		type: InteractionType.MESSAGE_COMPONENT,
		endless: true,
		limit: 1,
	});

	const verificationMessage = await verificationChannel.send({
		embeds: [{
			title: `${user.username} ~ ${user.tag}`,
			fields: answers.map(([question, answer]) => ({
				name: question,
				value: answer,
			})),
		}],
		components: [{
			type: MessageComponentType.ACTION_ROW,
			components: [{
				type: MessageComponentType.BUTTON,
				style: ButtonStyle.GREEN,
				label: 'Accept',
				customID: `${customID}|true`,
			}, {
				type: MessageComponentType.BUTTON,
				style: ButtonStyle.RED,
				label: 'Reject',
				customID: `${customID}|false`,
			}],
		}],
	});

	const selection =
		<MessageComponentInteraction> (await collector.waitFor('collect'))[0];

	const accepted = selection.data!.custom_id.split('|')[1]! === 'true';

	verificationMessage.delete();

	client.logging.get(guild.id)?.log(
		accepted ? 'verificationRequestAccept' : 'verificationRequestReject',
		user,
		selection.member!,
	);

	return accepted;
}

export { onSelectLanguageProficiency };

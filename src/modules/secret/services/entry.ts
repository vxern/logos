import {
	ButtonStyle,
	Collector,
	Guild,
	Interaction,
	InteractionMessageComponentData,
	InteractionModalSubmitData,
	MessageComponentData,
	MessageComponentType,
	User,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { capitalise, code } from '../../../formatting.ts';
import { getProficiencyCategory } from '../../../modules/roles/module.ts';
import { tryAssignRole } from '../../../modules/roles/data/structures/role.ts';
import { ServiceStarter } from '../../services.ts';
import configuration from '../../../configuration.ts';
import { getChannel, toModal } from '../../../utils.ts';

const steps = [
	'ACCEPTED_RULES',
	'SELECTED_LANGUAGE_PROFICIENCY',
] as const;
type Step = (typeof steps)[number];

/** Represents a decision on whether a user may or may not enter the server. */
interface EntryDecision {
	/** Whether the user can enter the server or not. */
	canEnter: boolean;
	/** If the user may not enter, the reason for their rejection. */
	reason?: string;
}

const proficiencyCategory = getProficiencyCategory();
const proficiencies = proficiencyCategory.collection!.list!;

const proficiencyButtons = proficiencies.map<MessageComponentData>(
	(proficiency, index) => {
		return {
			type: MessageComponentType.BUTTON,
			style: ButtonStyle.GREY,
			label: proficiency.name,
			emoji: { name: proficiency.emoji },
			customID: `SELECTED_LANGUAGE_PROFICIENCY|${index}`,
		};
	},
);

const service: ServiceStarter = (client) => {
	const collector = new Collector({
		event: 'interactionCreate',
		client: client,
		filter: (selection: Interaction) => {
			if (!selection.isMessageComponent()) {
				return false;
			}

			if (!steps.some((step) => selection.data.custom_id.startsWith(step))) {
				return false;
			}

			return true;
		},
		deinitOnEnd: true,
	});

	collector.on('collect', async (interaction: Interaction) => {
		const data = interaction.data! as InteractionMessageComponentData;
		const [step, index] = data.custom_id.split('|') as [Step, string];

		const language = client.getLanguage(interaction.guild!);

		switch (step) {
			case 'ACCEPTED_RULES': {
				const screening = screenUser(interaction.user);

				if (!screening.canEnter) {
					interaction.respond({
						embeds: [{
							title: 'Entry denied.',
							description: screening.reason!,
						}],
						ephemeral: true,
					});
					return;
				}

				interaction.respond({
					embeds: [{
						title: 'Language Proficiency',
						description: `Select the role that most accurately describes your ${
							capitalise(language)
						} language proficiency.\n\nYou can always change it later using the ${
							code('/profile roles')
						} command.`,
					}],
					components: [{
						type: MessageComponentType.ACTION_ROW,
						components: proficiencyButtons,
					}],
					ephemeral: true,
				});
				break;
			}
			case 'SELECTED_LANGUAGE_PROFICIENCY': {
				const requiresVerification = Object.entries(
					configuration.guilds.languages,
				).find(([key]) => key === language)![1].requiresVerification;

				if (requiresVerification) {
					interaction.showModal(
						toModal(configuration.interactions.forms.verification, language),
					);

					const collector = new Collector({
						event: 'interactionCreate',
						client: interaction.client,
						filter: (selection: Interaction) => {
							if (!selection.isModalSubmit()) return false;

							if (selection.user.id !== interaction.user.id) return false;

							if (selection.data.custom_id !== 'verification_questions') {
								return false;
							}

							return true;
						},
						deinitOnEnd: true,
					});

					collector.collect();

					const submission =
						(await collector.waitFor('collect'))[0] as Interaction;

					collector.end();

					const data = submission.data! as InteractionModalSubmitData;

					submission.respond({
						embeds: [{
							title: 'Answers submitted!',
							description:
								'Your answers to the verification questions have been submitted.\n\nYour request to join the server will be reviewed by a staff member, and you will be notified via DMs when your entry request is accepted.',
							color: configuration.interactions.responses.colors.green,
						}],
						ephemeral: true,
					});

					const answers = data.components!.map<[string, string]>(
						(component) => {
							const field = component.components[0]!;

							const fields = Object.entries(
								configuration.interactions.forms.verification.fields,
							);

							const question = fields.find(([name]) =>
								name === field.custom_id.split('|')[1]!
							)![1].label(language);

							return [question, field.value];
						},
					);

					if (
						!(await verifyUser(
							client,
							submission.guild!,
							submission.user,
							answers,
						))
					) {
						return;
					}
				}

				const proficiency = proficiencies[parseInt(index)]!;

				tryAssignRole(interaction, language, proficiencyCategory, proficiency);

				break;
			}
		}

		return;
	});

	collector.collect();
};

/**
 * Taking a user as a parameter, performs checks to determine whether a user
 * may enter the server or not.
 *
 * @param user - The user to screen.
 * @returns A decision in regards to the user being able to join.
 */
function screenUser(user: User): EntryDecision {
	if (
		(Date.now() - user.timestamp.getTime()) <
			configuration.guilds.entry.minimumRequiredAge
	) {
		return {
			canEnter: false,
			reason:
				'Due to security concerns, accounts that are too new may not enter the server.',
		};
	}

	return { canEnter: true };
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
	const verificationChannel = (await getChannel(
		guild,
		configuration.guilds.channels.verification,
	))!;

	const collector = new Collector({
		event: 'interactionCreate',
		client: guild.client,
		filter: (selection: Interaction) => {
			if (!selection.isMessageComponent()) {
				return false;
			}

			if (!selection.data.custom_id.startsWith('VERIFICATION')) {
				return false;
			}

			return true;
		},
		deinitOnEnd: true,
	});

	const verificationMessage = await verificationChannel.send({
		embeds: [{
			title: `${user.username} ~ ${user.tag}`,
			fields: answers.map(([question, answer]) => {
				return {
					name: question,
					value: answer,
				};
			}),
		}],
		components: [{
			type: MessageComponentType.ACTION_ROW,
			components: [{
				type: MessageComponentType.BUTTON,
				style: ButtonStyle.GREEN,
				label: 'Accept',
				customID: `VERIFICATION|true`,
			}, {
				type: MessageComponentType.BUTTON,
				style: ButtonStyle.RED,
				label: 'Reject',
				customID: `VERIFICATION|false`,
			}],
		}],
	});

	collector.collect();

	const selection = (await collector.waitFor('collect'))[0] as Interaction;

	collector.end();

	const data = selection.data! as InteractionMessageComponentData;

	const [_, accepted] = data.custom_id.split('|') as [string, boolean];

	verificationMessage.delete();

	client.logging.get(guild.id)?.log(
		'verificationRequestAccept',
		user,
		selection.member!,
	);

	return accepted;
}

export default service;

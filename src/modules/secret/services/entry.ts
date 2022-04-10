import {
	ButtonStyle,
	Collector,
	Interaction,
	InteractionMessageComponentData,
	InteractionResponseType,
	Member,
	MessageComponentData,
	MessageComponentType,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { capitalise, code } from '../../../formatting.ts';
import { getProficiencyCategory } from '../../../modules/roles/module.ts';
import { tryAssignRole } from '../../../modules/roles/data/structures/role.ts';
import { ServiceStarter } from '../../services.ts';
import configuration from '../../../configuration.ts';

interface MemberScreening {
	canEnter: boolean;
	reason?: string;
}

const steps = ['ACCEPTED_RULES', 'LANGUAGE_PROFICIENCY'] as const;
type Step = (typeof steps)[number];

const proficiencyCategory = getProficiencyCategory();
const proficiencies = proficiencyCategory.collection!.list!;

const proficiencyButtons = proficiencies.map<MessageComponentData>(
	(proficiency, index) => {
		return {
			type: MessageComponentType.BUTTON,
			style: ButtonStyle.GREY,
			label: proficiency.name,
			emoji: { name: proficiency.emoji },
			customID: `LANGUAGE_PROFICIENCY|${index}`,
		};
	},
);

const service: ServiceStarter = (client) => {
	const collector = new Collector({
		event: 'interactionCreate',
		client: client,
		filter: (selection) => {
			if (!(selection instanceof Interaction)) {
				return false;
			}

			if (!selection.isMessageComponent()) {
				return false;
			}
			const customID = selection.data.custom_id;
			if (!steps.some((step) => customID.startsWith(step))) {
				return false;
			}
			return true;
		},
		deinitOnEnd: true,
	});

	collector.on('collect', (interaction: Interaction) => {
		const data = interaction.data! as InteractionMessageComponentData;
		const [step, index] = data.custom_id.split('|') as [Step, string];

		const language = Client.getLanguage(interaction.guild!);

		switch (step) {
			case 'ACCEPTED_RULES': {
				const screening = screenMember(interaction.member!);

				if (!screening.canEnter) {
					interaction.respond({
						embeds: [{
							title: 'Entry denied',
							description: screening.reason!,
						}],
						ephemeral: true,
					});
					return;
				}

				interaction.respond({
					embeds: [{
						title: 'Language Proficiency',
						description: `Select the role which best describes your ${
							capitalise(language)
						} language proficiency.\n\nYou may always change it later using the ${
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
			case 'LANGUAGE_PROFICIENCY': {
				const proficiency = proficiencies[parseInt(index)]!;
				tryAssignRole(interaction, language, proficiencyCategory, proficiency);
				interaction.respond({
					type: InteractionResponseType.DEFERRED_MESSAGE_UPDATE,
				});
				break;
			}
		}

		return;
	});

	collector.collect();
};

function screenMember(member: Member): MemberScreening {
	if (
		(Date.now() - member.user.timestamp.getTime()) <
			configuration.guilds.entry.minimumRequiredAge
	) {
		return {
			canEnter: false,
			reason:
				'For security reasons, accounts which are too new may not enter the server.',
		};
	}

	return { canEnter: true };
}

export default service;

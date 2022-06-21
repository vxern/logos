import {
	ButtonStyle,
	MessageComponentData,
	MessageComponentInteraction,
	MessageComponentType,
	User,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import { capitalise, code } from '../../../../formatting.ts';
import { getProficiencyCategory } from '../../../../modules/roles/module.ts';
import configuration from '../../../../configuration.ts';

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

function onAcceptRules(
	client: Client,
	interaction: MessageComponentInteraction,
	_parameter: string,
): void {
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

	const language = client.getLanguage(interaction.guild!);

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
}

/** Represents a decision on whether a user may or may not enter the server. */
interface EntryDecision {
	/** Whether the user can enter the server or not. */
	canEnter: boolean;

	/** If the user may not enter, the reason for their rejection. */
	reason?: string;
}

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

export { onAcceptRules };

import {
	ActionRow,
	ApplicationCommandFlags,
	ButtonComponent,
	ButtonStyles,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	MessageComponentTypes,
	sendInteractionResponse,
	User,
} from '../../../deps.ts';
import { Client, getLanguage } from '../../client.ts';
import { capitalise, code } from '../../formatting.ts';
import configuration from '../../configuration.ts';
import { getProficiencyCategory } from '../../commands/social/module.ts';
import { snowflakeToTimestamp } from '../../utils.ts';

const proficiencyCategory = getProficiencyCategory();
const proficiencies = proficiencyCategory.collection.list;
const proficiencyButtonActionRow: ActionRow = {
	type: MessageComponentTypes.ActionRow,
	components: <[
		ButtonComponent,
		ButtonComponent,
		ButtonComponent,
		ButtonComponent,
	]> proficiencies.map<ButtonComponent>(
		(proficiency, index) => ({
			type: MessageComponentTypes.Button,
			label: proficiency.name,
			customId: `SELECTED_LANGUAGE_PROFICIENCY|${index}`,
			style: ButtonStyles.Secondary,
			emoji: { name: proficiency.emoji },
		}),
	),
};

function onAcceptRules(
	client: Client,
	interaction: Interaction & { type: InteractionTypes.MessageComponent },
	_parameter: string,
): void {
	const screening = screenUser(interaction.user);

	if (!screening.canEnter) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Entry denied.',
						description: screening.reason!,
					}],
				},
			},
		);
	}

	const language = getLanguage(client, interaction.guildId!);

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: 'Language Proficiency',
					description: `Select the role that most accurately describes your ${
						capitalise(language)
					} language proficiency.

          ℹ️ **You can always change this later using the ${
						code('/profile roles')
					} command.** ℹ️`,
				}],
				components: [proficiencyButtonActionRow],
			},
		},
	);
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
	const createdAt = snowflakeToTimestamp(user.id);

	if (
		(Date.now() - createdAt) <
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

import { Commands } from '../../../../assets/localisations/commands.ts';
import { Information } from '../../../../assets/localisations/information.ts';
import {
	createLocalisations,
	localise,
} from '../../../../assets/localisations/types.ts';
import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { capitalise } from '../../../formatting.ts';
import { defaultLanguage } from '../../../types.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.cite),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: citeRule,
	options: [{
		...createLocalisations(Commands.cite.options.rule),
		type: ApplicationCommandOptionTypes.String,
		required: true,
		autocomplete: true,
	}],
};

function citeRule(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
		const choices = Object.values(Information.rules.rules).map((
			rule,
			index,
		) => ({
			name: `#${index + 1}: ${
				localise(rule.title, interaction.locale).toLowerCase().split(' ').map(
					capitalise,
				).join(' ')
			}`,
			value: index.toString(),
		}));

		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: { choices },
			},
		);
	}

	const displayInvalidRuleError = (): void => {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(
							Commands.cite.strings.invalidRule,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	};

	const indexString = interaction.data?.options?.at(0)?.value;
	if (!indexString) return displayInvalidRuleError();

	const index = Number(indexString);
	if (isNaN(index)) return displayInvalidRuleError();

	const rule = Object.values(Information.rules.rules).at(index);
	if (!rule) return displayInvalidRuleError();

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `${localise(Information.rules.rule, defaultLanguage)} #${
						index + 1
					}: ${localise(rule.title, defaultLanguage)} ~ ${
						localise(Information.rules.tldr, defaultLanguage)
					}: *${localise(rule.summary, defaultLanguage)}*`,
					description: localise(rule.content, defaultLanguage)(guild),
					color: configuration.interactions.responses.colors.blue,
				}],
			},
		},
	);
}

export default command;

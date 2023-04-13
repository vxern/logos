import { ApplicationCommandTypes, Bot, ButtonStyles, Interaction, MessageComponentTypes } from 'discordeno';
import { CommandTemplate } from 'logos/src/commands/command.ts';
import { show } from 'logos/src/commands/parameters.ts';
import { Client, localise } from 'logos/src/client.ts';
import { parseArguments, reply } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: CommandTemplate = {
	name: 'resources',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: handleDisplayResources,
	options: [show],
};

/** Displays a message with information on where to find the resources for a given language. */
function handleDisplayResources([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ show }] = parseArguments(interaction.data?.options, { show: 'boolean' });

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const locale = show ? defaultLocale : interaction.locale;

	const strings = {
		redirect: localise(client, 'resources.strings.redirect', locale)({
			'language': localise(client, `languages.${guild.language.toLowerCase()}`, locale)(),
		}),
	};

	return void reply([client, bot], interaction, {
		components: [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				type: MessageComponentTypes.Button,
				label: strings.redirect,
				style: ButtonStyles.Link,
				url: constants.links.generateLanguageRepositoryLink(guild.language),
			}],
		}],
	}, { visible: show });
}

export default command;

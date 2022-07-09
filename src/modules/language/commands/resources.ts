import { Interaction } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';
import { mention } from '../../../formatting.ts';

const command: Command = {
	name: 'resources',
	availability: Availability.MEMBERS,
	description: 'Displays a list of resources to learn the language.',
	handle: resources,
};

/** Displays a message with information on where to find the resources for a given language. */
function resources(client: Client, interaction: Interaction): void {
	const language = client.getLanguage(interaction.guild!);

	interaction.respond({
		embeds: [{
			title: 'Resources',
			description:
				`Click [here](https://github.com/Linguition/${language}) for resources.

Feel free to contribute to the project by forking the repository, adding your own resources, and creating a pull request.

If you don't know how to use git, you can still contribute by listing the resources and tagging ${
					mention(configuration.guilds.owner.id, 'USER')
				}.`,
			color: configuration.interactions.responses.colors.blue,
		}],
	});
}

export default command;

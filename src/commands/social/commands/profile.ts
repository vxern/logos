import { ApplicationCommandTypes } from 'discordeno';
import roles from 'logos/src/commands/social/commands/profile/roles.ts';
import view from 'logos/src/commands/social/commands/profile/view.ts';
import { CommandTemplate } from 'logos/src/commands/command.ts';

const command: CommandTemplate = {
	name: 'profile',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [view, roles],
};

export default command;

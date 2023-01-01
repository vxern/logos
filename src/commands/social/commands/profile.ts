import { Commands, createLocalisations } from 'logos/assets/localisations/mod.ts';
import roles from 'logos/src/commands/social/commands/profile/roles.ts';
import view from 'logos/src/commands/social/commands/profile/view.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.profile),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [view, roles],
};

export default command;

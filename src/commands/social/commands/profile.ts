import { Commands, createLocalisations } from 'logos/assets/localisations/mod.ts';
import { CommandBuilder } from 'logos/src/commands/mod.ts';
import { roles, view } from 'logos/src/commands/social/commands/profile/mod.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.profile),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [view, roles],
};

export default command;

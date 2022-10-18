import { Commands } from '../../../../assets/localisations/commands.ts';
import { createLocalisations } from '../../../../assets/localisations/types.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import roles from './profile/roles.ts';
import view from './profile/view.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.profile),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [view, roles],
};

export default command;

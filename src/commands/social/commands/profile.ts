import { Commands, createLocalisations } from '../../../../assets/localisations/mod.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import roles from './profile/roles.ts';
import view from './profile/view.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.profile),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [view, roles],
};

export default command;

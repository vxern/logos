import { Commands, createLocalisations } from '../../../../assets/localisations/mod.ts';
import { CommandBuilder } from '../../../commands/mod.ts';
import { roles, view } from './profile/mod.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.profile),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [view, roles],
};

export default command;

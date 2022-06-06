import { Guild, Member, User } from '../../../../../deps.ts';
import configuration from '../../../../configuration.ts';
import { mentionUser } from '../../../../utils.ts';
import { MessageGenerators } from './generator.ts';

/** Type representing events that occur within a guild. */
type GuildEvents = {
	/** A verification request has been accepted. */
	verificationRequestAccept: [user: User, by: Member];

	/** A verification request has been rejected. */
	verificationRequestReject: [user: User, by: Member];
};

/** Contains the message generators for (custom) guild events. */
const generators: MessageGenerators<GuildEvents> = {
	'verificationRequestAccept': {
		title: 'Verification request accepted',
		message: (user: User, by: Member) =>
			`${mentionUser(user)}'s verification request has been accepted by ${
				mentionUser(by.user)
			}`,
		filter: (origin: Guild, _, by: Member) => origin.id === by.guild.id,
		color: configuration.responses.colors.green,
	},
	'verificationRequestReject': {
		title: 'Verification request rejected',
		message: (user: User, by: Member) =>
			`${mentionUser(user)}'s verification request has been rejected by ${
				mentionUser(by.user)
			}`,
		filter: (origin: Guild, _, by: Member) => origin.id === by.guild.id,
		color: configuration.responses.colors.red,
	},
};

export default generators;
export type { GuildEvents };

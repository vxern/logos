import { Guild, Member } from '../../../deps.ts';
import { Command } from '../../commands/structs/command.ts';
import configuration from '../../configuration.ts';
import { Document } from '../../database/structs/document.ts';
import { Warning } from '../../database/structs/users/warning.ts';
import { fetchGuildMembers } from '../../utils.ts';
import ban from './commands/ban.ts';
import cite from './commands/cite.ts';
import kick from './commands/kick.ts';
import list from './commands/list.ts';
import purge from './commands/purge.ts';
import slowmode from './commands/slowmode.ts';
import timeout from './commands/timeout.ts';
import unwarn from './commands/unwarn.ts';
import warn from './commands/warn.ts';

const commands: Record<string, Command> = {
	ban,
	cite,
	kick,
	list,
	purge,
	slowmode,
	timeout,
	unwarn,
	warn,
};

const userMentionExpression = new RegExp(/^<@!?([0-9]{18})>$/);
const userIDExpression = new RegExp(/^[0-9]{18}$/);

async function resolveUserIdentifier(guild: Guild, identifier: string): Promise<
	[Member | undefined, Member[] | undefined]
> {
	const isMention = userMentionExpression.test(identifier);
	const isId = userIDExpression.test(identifier);

	let id: string | undefined = undefined;
	if (isMention) {
		id = userMentionExpression.exec(identifier)![1]!;
	} else if (isId) {
		id = userIDExpression.exec(identifier)![0];
	}

	let member: Member | undefined = undefined;
	let matchingMembers: Member[] | undefined = undefined;
	if (id) {
		member = await guild.members.get(id) ??
			await guild.members.fetch(id);
	} else {
		const members = await fetchGuildMembers(guild);

		const searchParameter = identifier.toLowerCase();

		matchingMembers = members.filter((member) =>
			member.user.username.toLowerCase().includes(searchParameter) ||
			member.nick?.toLowerCase().includes(searchParameter)
		);
	}

	return [member, matchingMembers?.slice(0, 20)];
}

function getRelevantWarnings(
	warnings: Document<Warning>[],
): Document<Warning>[] {
	return warnings.filter((warning) =>
		(Date.now() - warning.ts) * 1000 <
			configuration.guilds.moderation.warnings.interval
	);
}

export default commands;
export { getRelevantWarnings, resolveUserIdentifier };

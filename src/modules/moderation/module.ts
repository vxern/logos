import { Guild, Member } from '../../../deps.ts';
import { Command } from '../../commands/structs/command.ts';
import configuration, { timeDescriptors } from '../../configuration.ts';
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

const digitsPattern = new RegExp(/\d+/g);
const wordsPattern = new RegExp(/[a-zA-Z]+/g);

function extractNumbers(expression: string): number[] {
	return (expression.match(digitsPattern) ?? []).map((digits) =>
		Number(digits)
	);
}

function extractWords(expression: string): string[] {
	return expression.match(wordsPattern) ?? [];
}

const timeDescriptorUnits = timeDescriptors.map(([descriptors, _value]) =>
	descriptors
);
const allValidTimeDescriptors = timeDescriptors.reduce<string[]>(
	(timeDescriptors, [next, _value]) => {
		timeDescriptors.push(...next);
		return timeDescriptors;
	},
	[],
);

function getTimestampFromExpression(
	expression: string,
): [string, number] | undefined {
	// Extract the digits present in the expression.
	const values = extractNumbers(expression).map((string) => Number(string));
	// Extract the strings present in the expression.
	const keys = extractWords(expression);

	// No parameters have been provided for both keys and values.
	if (keys.length === 0 || values.length === 0) return undefined;

	// The number of values does not match the number of keys.
	if (values.length !== keys.length) return undefined;

	// One of the values is equal to 0.
	if (values.includes(0)) return undefined;

	// If one of the keys is invalid.
	if (keys.some((key) => !allValidTimeDescriptors.includes(key))) {
		return undefined;
	}

	const distributionOfKeysInTimeDescriptorUnits = keys.reduce(
		(distribution, key) => {
			const index = timeDescriptorUnits.findIndex((distribution) =>
				distribution.includes(key)
			);

			distribution[index]++;

			return distribution;
		},
		Array.from({ length: timeDescriptors.length }, () => 0),
	);

	// If one of the keys is duplicate.
	if (distributionOfKeysInTimeDescriptorUnits.some((count) => count > 1)) {
		return undefined;
	}

	const keysWithValues: [string, [number, number]][] = keys.map(
		(key, index) => {
			const [descriptors, milliseconds] = timeDescriptors.find((
				[descriptors, _value],
			) => descriptors.includes(key))!;

			return [descriptors[descriptors.length - 1]!, [
				values[index]!,
				values[index]! * milliseconds,
			]];
		},
	);

	const timeExpressions = [];
	let total = 0;
	for (const [key, [nominal, milliseconds]] of keysWithValues) {
		timeExpressions.push(`${nominal} ${key}`);
		total += milliseconds;
	}

	const timeExpression = timeExpressions.join(' ');

	return [timeExpression, total];
}

export default commands;
export {
	getRelevantWarnings,
	getTimestampFromExpression,
	resolveUserIdentifier,
};

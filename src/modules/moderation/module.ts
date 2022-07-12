import { Command } from '../../commands/structs/command.ts';
import configuration, { timeDescriptors } from '../../configuration.ts';
import { Document } from '../../database/structs/document.ts';
import { Warning } from '../../database/structs/users/warning.ts';
import cite from './commands/cite.ts';
import list from './commands/list.ts';
import timeout from './commands/timeout.ts';
import unwarn from './commands/unwarn.ts';
import warn from './commands/warn.ts';

const commands: Record<string, Command> = {
	cite,
	list,
	timeout,
	unwarn,
	warn,
};

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
export { getRelevantWarnings, getTimestampFromExpression };

import {
	_,
	ApplicationCommand,
	ApplicationCommandOption,
	ApplicationCommandOptionType,
} from '../../deps.ts';
import { Command, CommandBuilder } from '../commands/structs/command.ts';
import { mergeOptions, unimplemented } from '../commands/command.ts';
import { Option } from '../commands/structs/option.ts';
import information from './information/module.ts';
import language from './language/module.ts';
import moderation from './moderation/module.ts';
import music from './music/module.ts';
import roles from './roles/module.ts';
import secret from './secret/module.ts';
import social from './social/module.ts';

const modules: Record<string, Command | CommandBuilder>[] = [
	information,
	language,
	moderation,
	music,
	roles,
	secret,
	social,
];

const generateCommands = (language: string) => mergeModules(modules, language);

/**
 * Compares two command or option objects to determine which keys one or the
 * other is missing.
 *
 * @param left - The Harmony object.
 * @param right - The source object.
 * @returns An array of keys which differ between the objects.
 */
function getMissingKeys(
	left: ApplicationCommand | ApplicationCommandOption,
	right: Command | Option,
): string[];
function getMissingKeys<
	L extends ApplicationCommand | ApplicationCommandOption,
	R extends Partial<L>,
>(
	left: L,
	right: R,
): string[] {
	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);
	const keysToIgnore = [
		...leftKeys.filter((leftKey) => !rightKeys.includes(leftKey)),
		...rightKeys.filter((rightKey) =>
			!leftKeys.includes(rightKey) && rightKey !== 'options'
		),
	];

	const unequalKeys = <string[]> _.reduce(
		right,
		(result: string[], value: unknown, key: keyof L) => {
			return _.isEqual(value, left[key])
				? result
				: result.concat(key.toString());
		},
		[],
	);

	const missingKeys = unequalKeys.filter((unequalKey) =>
		!keysToIgnore.includes(unequalKey)
	);

	return missingKeys;
}

/**
 * Combines modules into a single array of {@link Command}s, merging commands
 * with the same names but different options.
 *
 * @param modules - The modules to merge.
 * @returns The array of merged {@link Command}s.
 */
function mergeModules(
	modules: Record<string, Command | CommandBuilder>[],
	language: string,
): Command[] {
	const moduleCommands = modules.map((module) => Object.values(module)).map((
		commands,
	) =>
		commands.map((commandOrBuilder) =>
			typeof commandOrBuilder === 'function'
				? (<CommandBuilder> commandOrBuilder)(language)
				: commandOrBuilder
		)
	);

	// Obtain the array of separate commands.
	const commands = Array<Command>().concat(
		...moduleCommands.map((module) => Object.values(module)),
	);

	// Merge commands with the same name.
	return supplyMissingProperties(commands.filter((command, index, array) => {
		const firstIndex = array.findIndex((first) => first.name === command.name);

		if (firstIndex !== index) {
			array[firstIndex] = mergeOptions([array[firstIndex]!, command])!;
			return false;
		}

		return true;
	}));
}

/**
 * Supplies properties which may be undefined with default values as Discord
 * requires them to be truthy.
 *
 * @param elements - The array of {@link Command}s or {@link Option}s to whom to
 * supply missing properties.
 * @returns The modified array of {@link Command}s or {@link Option}s.
 */
function supplyMissingProperties<T extends Command | Option>(
	elements: T[],
): T[] {
	for (const element of elements) {
		element.description ??= 'No information available.';
		switch (element.type) {
			// An object represented by the Command interface will __not__ have the
			// 'type' property assigned, therefore an [element.type] of `undefined`
			// implies [element] is a command.
			case undefined:
				if (element.options && element.options.length > 0) break;
				if (!element.handle) {
					element.handle = unimplemented;
				}
				break;
			// Only options of type [OptionType.SUB_COMMAND] may have handlers.
			case ApplicationCommandOptionType.SUB_COMMAND:
				if (!element.handle) {
					element.handle = unimplemented;
				}
		}
		if (!element.options) continue;
		supplyMissingProperties((<Option> element).options!);
	}
	return elements;
}

/**
 * Compares an application command or option on the Discord API with an application
 * command or option defined on the {@link Client}.
 *
 * @param existent - The existent object saved in the Discord API.
 * @param introduced - The local object not yet saved to the API.
 * @returns The result of the comparison.
 */
function areEqual(
	existent: ApplicationCommand | ApplicationCommandOption | undefined,
	introduced: Command | Option | undefined,
): boolean {
	// If both [left] and [right] are `undefined`, raise equality.
	if (!existent && !introduced) return true;

	// If only one of either [left] or [right] is `undefined`, raise inequality.
	if (!(existent && introduced)) return false;

	// Check which keys are not equal between the two objects.
	const unequalKeys = getMissingKeys(existent, introduced);
	if (unequalKeys.length === 1) {
		if (unequalKeys[0] !== 'options') return false;

		if (!(existent.options && introduced.options)) return false;

		if (introduced.options!.length !== existent.options!.length) return false;

		return existent.options.every((option, index) =>
			areEqual(option, introduced.options![index])
		);
	}

	// If any of the keys are unequal, yield `false`.
	return unequalKeys.length === 0;
}

export default { modules: modules, generateCommands: generateCommands };
export { areEqual };

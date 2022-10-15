import { Locales, Localization as DiscordLocalisation } from '../../deps.ts';
import { Language } from '../../src/types.ts';

type Expression<T> = (argument: T) => string;
type Localisations<T> = Partial<Record<Language, T>> & { 'English': T };
type DiscordLocalisations = Record<
	'name' | 'description',
	Localisations<string>
>;
type CommandLocalisations<
	OptionKeys extends string,
	StringKeys extends string,
	OptionsType extends Record<OptionKeys, any> | undefined = undefined,
	StringsType extends Record<StringKeys, any> | undefined = undefined,
> =
	& DiscordLocalisations
	& (
		OptionsType extends undefined ? {
				options?: OptionsType;
			}
			: {
				options: OptionsType;
			}
	)
	& (
		StringsType extends undefined ? {
				strings?: StringsType;
			}
			: {
				strings: StringsType;
			}
	);

const languageByLocale: Partial<Record<Locales, Language>> = {
	'en-GB': 'English',
	'en-US': 'English',
	'pl': 'Polish',
	'ro': 'Romanian',
};

function getLanguageByLocale(locale: Locales): Language | undefined {
	return languageByLocale[locale];
}

function createDiscordLocalisations(
	localisations: Localisations<string>,
): DiscordLocalisation {
	return Object.fromEntries(
		(<[Language, string][]> Object.entries(localisations))
			.filter(([key, _value]) => key !== 'English')
			.map(([key, value]) => [Locales[<keyof typeof Locales> key], value]),
	);
}

interface DiscordLocalisationFields {
	name: string;
	nameLocalizations: DiscordLocalisation;
	description: string;
	descriptionLocalizations: DiscordLocalisation;
}

function createLocalisations(
	commandLocalisations: DiscordLocalisations,
): DiscordLocalisationFields {
	return {
		name: commandLocalisations.name['English'],
		nameLocalizations: createDiscordLocalisations(commandLocalisations.name),
		description: commandLocalisations.description['English'],
		descriptionLocalizations: createDiscordLocalisations(
			commandLocalisations.description,
		),
	};
}

function localise<T>(
	localisations: Localisations<T>,
	locale: string | undefined,
): T {
	if (!locale || !(locale in languageByLocale)) {
		return localisations['English'];
	}

	return localisations[getLanguageByLocale(<Locales> locale)!]!;
}

export type {
	CommandLocalisations,
	DiscordLocalisations,
	Expression,
	Localisations,
};
export { createLocalisations, getLanguageByLocale, localise };

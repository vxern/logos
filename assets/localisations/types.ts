import { Locales, Localization as DiscordLocalisation } from '../../deps.ts';
import { defaultLanguage, Language } from '../../src/types.ts';
import { getLocale } from './languages.ts';

type Expression<T> = (argument: T) => string;
type Localisations<T> = Partial<Record<Language, T>> & { [defaultLanguage]: T };
type DiscordLocalisations = Required<
	Record<
		'name' | 'description',
		Localisations<string>
	>
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
			.filter(([key, _value]) => key !== defaultLanguage)
			.map(([key, value]) => [getLocale(key), value]),
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
		name: commandLocalisations.name[defaultLanguage],
		nameLocalizations: createDiscordLocalisations(commandLocalisations.name),
		description: commandLocalisations.description[defaultLanguage],
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
		return localisations[defaultLanguage];
	}

	const language = getLanguageByLocale(<Locales> locale)!;
	if (!(language in localisations)) {
		return localisations[defaultLanguage];
	}

	return localisations[language]!;
}

function ensureType<T>(object: T): T {
	return object;
}

export type {
	CommandLocalisations,
	DiscordLocalisations,
	Expression,
	Localisations,
};
export { createLocalisations, ensureType, getLanguageByLocale, localise };

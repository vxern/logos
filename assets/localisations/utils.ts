import { Locales, Localization as DiscordLocalisation } from 'discordeno';
import { localisationsByLanguage } from 'logos/assets/localisations/languages.ts';
import { defaultLanguage, Language } from 'logos/types.ts';

type LocalisationsByLanguage<L extends string> =
	& Required<Record<Language, Localisations<string>>>
	& Record<L, Localisations<string>>;

function inferLanguages<L extends string>(localisations: LocalisationsByLanguage<L>): LocalisationsByLanguage<L> {
	return localisations;
}

// Obtained from https://www.deepl.com/docs-api/translate-text/translate-text.
type TranslationLanguage = Language | keyof typeof localisationsByLanguage;

type Expression<T> = (argument: T) => string;
type Localisations<T> = Partial<Record<Language, T>> & { [defaultLanguage]: T };
type DiscordLocalisations = Required<Record<'name' | 'description', Localisations<string>>>;
type CommandLocalisations<
	OptionKeys extends string,
	StringKeys extends string,
	OptionsType extends Record<OptionKeys, unknown> | undefined = undefined,
	StringsType extends Record<StringKeys, unknown> | undefined = undefined,
> =
	& DiscordLocalisations
	& (OptionsType extends undefined ? { options?: OptionsType } : { options: OptionsType })
	& (StringsType extends undefined ? { strings?: StringsType } : { strings: StringsType });

const languageByLocale: Partial<Record<Locales, Language>> = {
	'en-GB': 'English',
	'en-US': 'English',
	'pl': 'Polish',
	'ro': 'Romanian',
};

const localeByLanguage: Partial<Record<Language, `${Locales}`>> = {
	'English': 'en-GB',
	'Polish': 'pl',
	'Romanian': 'ro',
};

function getLanguageByLocale(locale: Locales): Language | undefined {
	return languageByLocale[locale];
}

function getLocaleByLanguage(language: Language): typeof localeByLanguage[keyof typeof localeByLanguage] {
	return localeByLanguage[language] ?? 'en-GB';
}

function localise<T>(localisations: Localisations<T>, locale: string | undefined): T {
	if (locale === undefined || !(locale in languageByLocale)) {
		return localisations[defaultLanguage];
	}

	const language = getLanguageByLocale(<Locales> locale)!;
	if (!(language in localisations)) {
		return localisations[defaultLanguage];
	}

	return localisations[language]!;
}

function getLocalisationsForLanguage(language: TranslationLanguage): Localisations<string> {
	return localisationsByLanguage[language];
}

interface DiscordLocalisationFields {
	name: string;
	nameLocalizations: DiscordLocalisation;
	description: string;
	descriptionLocalizations: DiscordLocalisation;
}

function createLocalisations(commandLocalisations: DiscordLocalisations): DiscordLocalisationFields {
	return {
		name: commandLocalisations.name[defaultLanguage],
		nameLocalizations: createDiscordLocalisations(commandLocalisations.name),
		description: commandLocalisations.description[defaultLanguage],
		descriptionLocalizations: createDiscordLocalisations(
			commandLocalisations.description,
		),
	};
}

function createDiscordLocalisations(localisations: Localisations<string>): DiscordLocalisation {
	return Object.fromEntries(
		(<[Language, string][]> Object.entries(localisations))
			.filter(([key, _value]) => key !== defaultLanguage)
			.map(([key, value]) => [getLocaleByLanguage(key), value]),
	);
}

function ensureType<T>(object: T): T {
	return object;
}

function typedLocalisations<
	OptionKeys extends string,
	StringKeys extends string,
	OptionsType extends Record<OptionKeys, unknown> | undefined,
	StringsType extends Record<StringKeys, unknown> | undefined,
>(
	localisations: CommandLocalisations<OptionKeys, StringKeys, OptionsType, StringsType>,
): CommandLocalisations<OptionKeys, StringKeys, OptionsType, StringsType> {
	return localisations;
}

export {
	createLocalisations,
	ensureType,
	getLanguageByLocale,
	getLocaleByLanguage,
	getLocalisationsForLanguage,
	inferLanguages,
	localise,
	typedLocalisations,
};
export type { CommandLocalisations, DiscordLocalisations, Expression, Localisations, TranslationLanguage };

import { Locales, Localization as DiscordLocalisation } from '../../deps.ts';
import { Language } from '../../src/types.ts';

type Expression<T> = (argument: T) => string;
type Localisations<T> = Partial<Record<Language, T>>;
type DiscordLocalisations = Record<
	'name' | 'description',
	Localisations<string> & { 'English': string }
>;

const languagesByLocale: Partial<Record<Locales, Language>> = {
	'en-GB': 'English',
	'en-US': 'English',
	'pl': 'Polish',
	'ro': 'Romanian',
};

function getLanguageByLocale(locale: Locales): Language | undefined {
	return languagesByLocale[locale];
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

export type { DiscordLocalisations, Expression, Localisations };
export { createLocalisations, getLanguageByLocale };

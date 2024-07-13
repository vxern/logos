import type { ContextBuilder } from "logos:constants/contexts";
import {
	type Locale,
	type LocalisationLanguage,
	getDiscordLocaleByLocalisationLanguage,
	getLocalisationLanguageByLocale,
	isDiscordLocalisationLanguage,
} from "logos:constants/languages";
import type { Environment } from "logos:core/loaders/environment";
import { Logger } from "logos/logger";
import type { ReplyVisibility } from "logos/stores/interactions";

type RawLocalisationBuilder = (data?: Record<string, unknown>) => string | undefined;
type LocalisationBuilder = (data?: Record<string, unknown>) => string;
type RawLocalisations = Map<string, Map<LocalisationLanguage, string>>;
type Localisations = Map<
	// String key.
	string,
	Map<
		// Language the string is localised into.
		LocalisationLanguage,
		// Generator function for dynamically slotting data into the string.
		LocalisationBuilder
	>
>;
interface NameLocalisations {
	readonly name: string;
	readonly nameLocalizations?: Partial<Record<Discord.Locales, string>>;
}
interface DescriptionLocalisations {
	readonly description: string;
	readonly descriptionLocalizations?: Partial<Record<Discord.Locales, string>>;
}
class LocalisationStore {
	readonly log: Logger;

	readonly #localisations: Localisations;

	constructor({ environment, localisations }: { environment: Environment; localisations: RawLocalisations }) {
		this.log = Logger.create({ identifier: "Client/LocalisationStore", isDebug: environment.isDebug });

		this.#localisations = LocalisationStore.#buildLocalisations(localisations);
	}

	static #buildLocalisations(localisations: RawLocalisations): Localisations {
		const builders = new Map<string, Map<LocalisationLanguage, LocalisationBuilder>>();
		for (const [key, languages] of localisations.entries()) {
			const processors = new Map<LocalisationLanguage, LocalisationBuilder>();
			for (const [language, string] of languages.entries()) {
				processors.set(language, (data?: Record<string, unknown>) =>
					LocalisationStore.#processString(string, { data }),
				);
			}

			builders.set(key, processors);
		}

		return builders;
	}

	static #processString(string: string, { data }: { data?: Record<string, unknown> }) {
		if (data === undefined) {
			return string;
		}

		let result = string;
		for (const [key, value] of Object.entries(data)) {
			result = result.replaceAll(`{${key}}`, `${value}`);
		}
		return result;
	}

	getOptionName({ key }: { key: string }): string | undefined {
		const optionName = key.split(".").at(-1)!;
		if (optionName.length === 0) {
			this.log.warn(`Failed to get option name from localisation key '${key}'.`);
			return undefined;
		}

		return optionName;
	}

	buildNameLocalisations({ key }: { key: string }): NameLocalisations | undefined {
		const optionName = this.getOptionName({ key });
		if (optionName === undefined) {
			return undefined;
		}

		let localisation: Map<LocalisationLanguage, LocalisationBuilder> | undefined;
		if (this.#localisations.has(`${key}.name`)) {
			localisation = this.#localisations.get(`${key}.name`)!;
		} else if (this.#localisations.has(`parameters.${optionName}.name`)) {
			localisation = this.#localisations.get(`parameters.${optionName}.name`)!;
		}

		const name = localisation?.get(constants.defaults.LOCALISATION_LANGUAGE)?.();
		if (name === undefined) {
			this.log.warn(`Could not get command name from string with key '${key}'.`);
			return undefined;
		}

		if (localisation === undefined) {
			return { name };
		}

		const nameLocalisations = LocalisationStore.#toDiscordLocalisations(localisation);

		return { name, nameLocalizations: nameLocalisations };
	}

	buildDescriptionLocalisations({ key }: { key: string }): DescriptionLocalisations | undefined {
		const optionName = this.getOptionName({ key });
		if (optionName === undefined) {
			return undefined;
		}

		let localisation: Map<LocalisationLanguage, LocalisationBuilder> | undefined;
		if (this.#localisations.has(`${key}.description`)) {
			localisation = this.#localisations.get(`${key}.description`)!;
		} else if (this.#localisations.has(`parameters.${optionName}.description`)) {
			localisation = this.#localisations.get(`parameters.${optionName}.description`)!;
		}

		const description = localisation?.get(constants.defaults.LOCALISATION_LANGUAGE)?.({});
		if (description === undefined) {
			this.log.warn(`Could not get command description from string with key '${key}'.`);
			return undefined;
		}

		if (localisation === undefined) {
			return { description };
		}

		const descriptionLocalisations = LocalisationStore.#toDiscordLocalisations(localisation);

		return { description, descriptionLocalizations: descriptionLocalisations };
	}

	static #toDiscordLocalisations(
		localisations: Map<LocalisationLanguage, (args: Record<string, unknown>) => string>,
	): Discord.Localization {
		const result: Discord.Localization = {};
		for (const [language, localise] of localisations.entries()) {
			if (!isDiscordLocalisationLanguage(language)) {
				continue;
			}

			const locale = getDiscordLocaleByLocalisationLanguage(language);
			if (locale === undefined) {
				continue;
			}

			const string = localise({});
			if (string.length === 0) {
				continue;
			}

			result[locale] = string;
		}

		return result;
	}

	has(key: string): boolean {
		return this.#localisations.has(key);
	}

	localiseRaw(key: string, locale?: Locale): RawLocalisationBuilder {
		return (data) => {
			const localisation = this.#localisations.get(key);
			if (localisation === undefined) {
				return undefined;
			}

			let language: LocalisationLanguage;
			if (locale !== undefined) {
				language = getLocalisationLanguageByLocale(locale);
			} else {
				language = constants.defaults.LOCALISATION_LANGUAGE;
			}

			const buildLocalisation =
				localisation.get(language) ?? localisation.get(constants.defaults.LOCALISATION_LANGUAGE);
			if (buildLocalisation === undefined) {
				this.log.error(`Missing localisations for string with key '${key}'.`);
				return undefined;
			}

			return buildLocalisation(data);
		};
	}

	localise(key: string, locale?: Locale): LocalisationBuilder {
		return (data) => {
			const localisation = this.localiseRaw(key, locale)(data);
			if (localisation === undefined) {
				this.log.error(`Attempted to localise string with unregistered key '${key}'.`);
				return constants.special.missingString;
			}

			return localisation;
		};
	}

	localiseCommand(key: string, locale?: Locale): string {
		const keyParts = key.split(".options.");
		if (keyParts.length === 0) {
			return constants.special.missingString;
		}

		const parts: string[] = [];
		for (const index of new Array(keyParts.length).keys()) {
			const part = keyParts.slice(0, index + 1).join(".options.");
			parts.push(this.localise(`${part}.name`, locale)());
		}
		const commandName = parts.join(" ");

		return `/${commandName}`;
	}

	pluralise(key: string, locale: Locale, { quantity }: { quantity: number }): string {
		const language = getLocalisationLanguageByLocale(locale);

		const pluralise = constants.localisations.transformers[language].pluralise;
		const { one, two, many } = {
			one: this.localise(`${key}.one`, locale)?.({ one: quantity }),
			two: this.localise(`${key}.two`, locale)?.({ two: quantity }),
			many: this.localise(`${key}.many`, locale)?.({ many: quantity }),
		};

		const pluralised = pluralise(`${quantity}`, { one, two, many });
		if (pluralised === undefined) {
			this.log.warn(`Could not pluralise string with key '${key}' in ${language}.`);
			return key;
		}

		return pluralised;
	}

	async withContext<T extends object, R>(
		interaction: Logos.Interaction,
		{ contexts, visibility }: { contexts: ContextBuilder<T>[]; visibility?: ReplyVisibility },
		scope: (strings: T) => Promise<R>,
	): Promise<R> {
		const locale = visibility === "public" ? interaction.guildLocale : interaction.locale;

		const strings = contexts
			.map((builder) => builder({ localise: this.localise, locale }))
			.reduce<T>((combined, context) => Object.assign(combined, context), {} as T);

		return await scope(strings);
	}
}

export { LocalisationStore };
export type { LocalisationBuilder, RawLocalisations, NameLocalisations, DescriptionLocalisations };

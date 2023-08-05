import constants from "../../../constants/constants";
import { FeatureLanguage } from "../../../constants/language";
import { Client } from "../../client";
import { addParametersToURL } from "../../utils";
import partsOfSpeech, { PartOfSpeech } from "./dictionaries/parts-of-speech";

interface DeepLSupportedLanguage {
	language: string;
	name: string;
	supports_formality: boolean;
}

/** Represents a supported language object sent by DeepL. */
interface SupportedLanguage {
	/** The language name */
	name: string;

	/** The language code. */
	code: string;

	/** Whether the formality option is supported for this language. */
	supportsFormality: boolean;
}

async function getSupportedLanguages(environment: Client["metadata"]["environment"]): Promise<SupportedLanguage[]> {
	console.info("[Translations] Getting list of supported translation languages from DeepL...");

	const response = await fetch(
		addParametersToURL(constants.endpoints.deepl.languages, {
			auth_key: environment.deeplSecret,
			type: "target",
		}),
	);
	if (!response.ok) {
		return [];
	}

	const resultsRaw = (await response.json().catch(() => [])) as DeepLSupportedLanguage[];
	const results = resultsRaw.map((result) => ({
		name: result.name,
		code: result.language,
		supportsFormality: result.supports_formality,
	}));

	console.info(`[Translations] List of supported translation languages features ${results.length} language(s).`);

	return results;
}

function resolveToSupportedLanguage(client: Client, languageOrCode: string): SupportedLanguage | undefined {
	const languageOrCodeLowercase = languageOrCode.toLowerCase();
	return client.metadata.supportedTranslationLanguages.find(
		(language) =>
			language.code.toLowerCase() === languageOrCodeLowercase || language.name.toLowerCase() === languageOrCode,
	);
}

function getPartOfSpeech(
	exact: string,
	approximate: string,
	language: FeatureLanguage,
): [detected: PartOfSpeech, original: string] {
	const localised = partsOfSpeech[language];
	if (localised === undefined) {
		return ["unknown", exact];
	}

	const detected = (() => {
		const exactMatch = localised[exact];
		if (exactMatch !== undefined) {
			return exactMatch;
		}

		const approximateMatch = localised[approximate];
		if (approximateMatch !== undefined) {
			return approximateMatch;
		}

		return "unknown";
	})();

	return [detected, exact];
}

export { getPartOfSpeech, getSupportedLanguages, resolveToSupportedLanguage };
export type { SupportedLanguage };

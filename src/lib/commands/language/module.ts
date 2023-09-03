import { LearningLanguage } from "../../../constants/languages";
import { PartOfSpeech } from "./dictionaries/part-of-speech";
import partsOfSpeech from "./dictionaries/parts-of-speech";

function getPartOfSpeech(
	exact: string,
	approximate: string,
	language: LearningLanguage,
): [detected: PartOfSpeech, original: string] {
	const localised = partsOfSpeech[language] as Record<string, PartOfSpeech>;
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

export { getPartOfSpeech };

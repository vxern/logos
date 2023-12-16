import { isLocalisationLanguage } from "../languages";
import { Language as LocalisationLanguage } from "./localisation";

type Language = LocalisationLanguage;

function isLanguage(language: string): language is Language {
	return isLocalisationLanguage(language);
}

export { isLanguage };
export type { Language };

import type {
	FeatureLanguage,
	LearningLanguage,
	Locale,
	LocalisationLanguage,
	TranslationLanguage,
} from "logos:constants/languages";
import type { RateLimit, TimeStruct } from "logos/models/guild";

const FEATURE_LOCALE: Locale = "eng-US";
const FEATURE_LANGUAGE: FeatureLanguage = "English";
const LEARNING_LOCALE: Locale = "eng-US";
const LEARNING_LANGUAGE: LearningLanguage = "English/American";
const LOCALISATION_LOCALE: Locale = "eng-US";
const LOCALISATION_LANGUAGE: LocalisationLanguage = "English/American";
const TRANSLATION_LANGUAGE: TranslationLanguage = "English/American";

const COMMAND_RATE_LIMIT: RateLimit = { uses: 5, within: [10, "second"] };
const REPORT_RATE_LIMIT: RateLimit = { uses: 50, within: [1, "day"] };
const RESOURCE_RATE_LIMIT: RateLimit = { uses: 500, within: [1, "day"] };
const SUGGESTION_RATE_LIMIT: RateLimit = { uses: 50, within: [1, "day"] };
const TICKET_RATE_LIMIT: RateLimit = { uses: 10, within: [1, "day"] };
const PRAISE_RATE_LIMIT: RateLimit = { uses: 10, within: [1, "day"] };

const WARN_LIMIT = 3;
const WARN_EXPIRY: TimeStruct = [2, "month"];
const WARN_TIMEOUT: TimeStruct = [1, "day"];

const MUSIC_DISCONNECT_TIMEOUT: TimeStruct = [2, "minute"];

const MINIMUM_VOICE_CHANNELS = 0;
const MAXIMUM_VOICE_CHANNELS = 5;

export default Object.freeze({
	LOCALISATION_LANGUAGE,
	LOCALISATION_LOCALE,
	LEARNING_LANGUAGE,
	LEARNING_LOCALE,
	FEATURE_LANGUAGE,
	FEATURE_LOCALE,
	TRANSLATION_LANGUAGE,
	COMMAND_RATE_LIMIT,
	REPORT_RATE_LIMIT,
	RESOURCE_RATE_LIMIT,
	TICKET_RATE_LIMIT,
	SUGGESTION_RATE_LIMIT,
	PRAISE_RATE_LIMIT,
	WARN_LIMIT,
	WARN_EXPIRY,
	WARN_TIMEOUT,
	MUSIC_DISCONNECT_TIMEOUT,
	MINIMUM_VOICE_CHANNELS,
	MAXIMUM_VOICE_CHANNELS,
});

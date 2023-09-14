import symbols from "./symbols";

export default {
	roleIndicators: new RegExp(
		`^(.+)${symbols.sigils.divider}([^${symbols.sigils.separator}]{2,4}(?:${symbols.sigils.separator}[^${symbols.sigils.separator}]{2,4})*)$`,
	),
	wiktionaryPronunciationModels: /(?:, )?(\w+(?:\(\w+\))?): /g,
};

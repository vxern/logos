import symbols from "./symbols";

export default {
	roleIndicators: new RegExp(
		`^(.+)${symbols.sigils.divider}([^${symbols.sigils.separator}]{2,4}(?:${symbols.sigils.separator}[^${symbols.sigils.separator}]{2,4})*)$`,
	),
	wholeWord: (word: string) => new RegExp(`(?<=^|\\p{Z}|\\p{P})${word}(?=\\p{Z}|\\p{P}|$)`, "giu"),
};

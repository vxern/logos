import { Client } from "logos/client";
import { Locale } from "logos:constants/languages";
import { Rule, isValidRule } from "logos:constants/rules";

type RuleOrOther = Rule | "other";
type RuleTitleMode = "option" | "display";
function getRuleTitleFormatted(
	client: Client,
	{ rule, mode }: { rule: RuleOrOther; mode: RuleTitleMode },
	{ locale }: { locale: Locale },
): string {
	const index = isValidRule(rule) ? constants.rules.indexOf(rule) : undefined;

	const strings = {
		title: client.localise(`rules.${rule}.title`, locale)(),
		summary: client.localise(`rules.${rule}.summary`, locale)(),
	};

	const indexFormatted = index !== undefined ? index + 1 : "?";

	switch (mode) {
		case "option":
			return `#${indexFormatted} ${strings.title} ~ ${strings.summary}`;
		case "display":
			return `${indexFormatted} - ${strings.title}`;
	}
}

export { getRuleTitleFormatted };
export type { RuleOrOther };

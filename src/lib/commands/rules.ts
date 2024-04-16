import { Rule, isValidRule } from "logos:constants/rules";
import { Client } from "logos/client";

type RuleOrOther = Rule | "other";
type RuleTitleMode = "option" | "display";
function getRuleTitleFormatted(
	client: Client,
	interaction: Logos.Interaction,
	{ rule, mode }: { rule: RuleOrOther; mode: RuleTitleMode },
): string {
	const index = isValidRule(rule) ? constants.rules.indexOf(rule) : undefined;

	let strings: { title: string; summary: string };
	switch (rule) {
		case "behaviour": {
			strings = constants.contexts.behaviourRule({ localise: client.localise, locale: interaction.locale });
			break;
		}
		case "quality": {
			strings = constants.contexts.qualityRule({ localise: client.localise, locale: interaction.locale });
			break;
		}
		case "relevance": {
			strings = constants.contexts.relevanceRule({ localise: client.localise, locale: interaction.locale });
			break;
		}
		case "suitability": {
			strings = constants.contexts.suitabilityRule({ localise: client.localise, locale: interaction.locale });
			break;
		}
		case "exclusivity": {
			strings = constants.contexts.exclusivityRule({ localise: client.localise, locale: interaction.locale });
			break;
		}
		case "adherence": {
			strings = constants.contexts.adherenceRule({ localise: client.localise, locale: interaction.locale });
			break;
		}
		case "other": {
			strings = constants.contexts.otherRule({ localise: client.localise, locale: interaction.locale });
			break;
		}
	}

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

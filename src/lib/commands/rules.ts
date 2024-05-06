import { RuleOrOther, isValidRule } from "logos:constants/rules";
import { Client } from "logos/client";

type RuleTitleMode = "option" | "display";
function getRuleTitleFormatted(
	client: Client,
	interaction: Logos.Interaction,
	{ rule, mode }: { rule: RuleOrOther; mode: RuleTitleMode },
): string {
	const index = isValidRule(rule) ? constants.rules.indexOf(rule) : undefined;
	const indexFormatted = index !== undefined ? index + 1 : "?";
	const strings = constants.contexts.rule({ localise: client.localise.bind(client), locale: interaction.locale });
	switch (mode) {
		case "option":
			return `#${indexFormatted} ${strings.title(rule)} ~ ${strings.summary(rule)}`;
		case "display":
			return `${indexFormatted} - ${strings.title(rule)}`;
	}
}

export { getRuleTitleFormatted };

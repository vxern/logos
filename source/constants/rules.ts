const rules = ["behaviour", "quality", "relevance", "suitability", "exclusivity", "adherence"] as const;
type Rule = (typeof rules)[number];
type RuleOrOther = Rule | "other";

function isValidRule(rule: string): rule is Rule {
	return (rules as readonly string[]).includes(rule);
}

export default Object.freeze(rules);
export { isValidRule };
export type { Rule, RuleOrOther };

type TransformerType = "pluralise";
type Transformer = (matchTerm: string, matches: Record<string, string>) => string | undefined;

export type { Transformer, TransformerType };

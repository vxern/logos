const provisions = [
	"part-of-speech",
	"definitions",
	"translations",
	"relations",
	"syllables",
	"pronunciation",
	"rhymes",
	"audio",
	"expressions",
	"examples",
	"frequency",
	"inflection",
	"etymology",
	"notes",
] as const;
type DictionaryProvision = typeof provisions[number];

function createProvisionSupply(): Record<DictionaryProvision, number> {
	return Object.fromEntries(provisions.map((provision) => [provision, 0])) as Record<DictionaryProvision, number>;
}

function getProvisionsWithoutSupply(provisionFrequencies: Record<DictionaryProvision, number>): DictionaryProvision[] {
	return (Object.entries(provisionFrequencies) as [DictionaryProvision, number][])
		.filter(([_, frequency]) => frequency === 0)
		.map(([provision, _]) => provision);
}

export { createProvisionSupply, getProvisionsWithoutSupply };
export type { DictionaryProvision };

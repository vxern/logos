import { describe, it } from "bun:test";
import { type PartOfSpeech, getPartOfSpeech, isUnknownPartOfSpeech } from "logos:constants/parts-of-speech";
import { expect } from "chai";

describe("isUnknownPartOfSpeech()", () => {
	it("returns true when the part of speech is 'unknown'.", () => {
		expect(isUnknownPartOfSpeech("unknown")).to.be.true;
	});

	it("returns false when the part of speech is not 'unknown'.", () => {
		expect(isUnknownPartOfSpeech("proper-noun")).to.be.false;
	});
});

describe("getPartOfSpeech()", () => {
	it("returns the part of speech if the passed exact term is a resolvable part of speech.", () => {
		const [detected, original] = getPartOfSpeech({
			terms: { exact: "proper-noun" satisfies PartOfSpeech },
			learningLanguage: "Romanian",
		});
		expect(detected).to.equal("proper-noun" satisfies PartOfSpeech);
		expect(original).to.equal("proper-noun");
	});

	it("returns 'unknown' if the learning language is not supported.", () => {
		const [detected, original] = getPartOfSpeech({
			terms: { exact: "գոյական" }, // 'noun' in Armenian
			learningLanguage: "Armenian/Eastern",
		});
		expect(detected).to.equal("unknown" satisfies PartOfSpeech);
		expect(original).to.equal("գոյական");
	});

	it("returns the part of speech matched to the exact term in the given language.", () => {
		const [detected, original] = getPartOfSpeech({
			terms: { exact: "substantiv" },
			learningLanguage: "Romanian",
		});
		expect(detected).to.equal("noun" satisfies PartOfSpeech);
		expect(original).to.equal("substantiv");
	});

	it(
		"returns the part of speech matched to the approximate term in the given language if the exact term has no" +
			" match.",
		() => {
			const [detected, original] = getPartOfSpeech({
				terms: { exact: "this.will.not.match", approximate: "proper noun" },
				learningLanguage: "English/American",
			});
			expect(detected).to.equal("proper-noun" satisfies PartOfSpeech);
			expect(original).to.equal("proper noun");
		},
	);

	it("returns 'unknown' if there is no match", () => {
		const [detected, original] = getPartOfSpeech({
			terms: { exact: "this.will.not.match" },
			learningLanguage: "English/American",
		});
		expect(detected).to.equal("unknown" satisfies PartOfSpeech);
		expect(original).to.equal("this.will.not.match");
	});
});

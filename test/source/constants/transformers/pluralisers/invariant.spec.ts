import { describe, it } from "bun:test";
import { expect } from "chai";
import pluralise from "logos:constants/transformers/pluralisers/invariant";

describe("pluralise()", () => {
	const FORMS = { one: "ember" };

	it("returns undefined if the passed object does not contain form `one`.", () => {
		expect(pluralise("0", {})).to.be.undefined;
	});

	it("returns the singular form when the quantity is 1.", () => {
		expect(pluralise("1", FORMS)).to.equal("ember");
	});

	it("returns the singular form when the quantity is 0.", () => {
		expect(pluralise("0", FORMS)).to.equal("ember");
	});

	it("returns the singular form when the quantity is -1.", () => {
		expect(pluralise("-1", FORMS)).to.equal("ember");
	});

	it("returns the singular form when the quantity is 2 or more.", () => {
		expect(pluralise("2", FORMS)).to.equal("ember");
	});

	it("returns the singular form when the quantity is -2 or less.", () => {
		expect(pluralise("-2", FORMS)).to.equal("ember");
	});
});

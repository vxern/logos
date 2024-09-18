import { describe, it } from "bun:test";
import pluralise from "logos:constants/transformers/pluralisers/common-european";
import { expect } from "chai";

const FORMS = { one: "thing", two: "things" };

describe("pluralise()", () => {
	it("returns undefined when the passed object does not contain forms `one` and `two`.", () => {
		expect(pluralise("0", {})).to.be.undefined;
		expect(pluralise("1", { one: "thing" })).to.be.undefined;
		expect(pluralise("2", { two: "things" })).to.be.undefined;
	});

	it("does not return undefined when the passed object contains forms `one` and `two`.", () => {
		expect(pluralise("2", FORMS)).to.not.be.undefined;
	});

	it("returns the singular form when the quantity is 1.", () => {
		expect(pluralise("1", FORMS)).to.equal("thing");
	});

	it("returns the plural form when the quantity is 0.", () => {
		expect(pluralise("0", FORMS)).to.equal("things");
	});

	it("returns the singular form when the quantity is -1.", () => {
		expect(pluralise("1", FORMS)).to.equal("thing");
	});

	it("returns the plural form for numbers 2 or more.", () => {
		expect(pluralise("2", FORMS)).to.equal("things");
		expect(pluralise("3", FORMS)).to.equal("things");
	});

	it("returns the plural form for numbers -2 or less.", () => {
		expect(pluralise("-2", FORMS)).to.equal("things");
		expect(pluralise("-3", FORMS)).to.equal("things");
	});
});

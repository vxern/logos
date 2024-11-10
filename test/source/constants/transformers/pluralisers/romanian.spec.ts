import { describe, it } from "bun:test";
import pluralise from "logos:constants/transformers/pluralisers/romanian";
import { expect } from "chai";

const FORMS = { one: "casă", two: "case", many: "de case" };

describe("pluralise()", () => {
	it("returns undefined if the passed object does not contain forms `one`, `two` and `many`.", () => {
		expect(pluralise("0", {})).to.be.undefined;
		expect(pluralise("1", { one: "casă" })).to.be.undefined;
		expect(pluralise("2", { one: "casă", two: "case" })).to.be.undefined;
		expect(pluralise("2", { two: "case" })).to.be.undefined;
		expect(pluralise("20", { two: "case", many: "de case" })).to.be.undefined;
		expect(pluralise("20", { many: "de case" })).to.be.undefined;
	});

	it("does not return undefined when the passed object contains forms `one`, `two` and `many`.", () => {
		expect(pluralise("20", FORMS)).to.not.be.undefined;
	});

	it("returns the singular form when the quantity is 1.", () => {
		expect(pluralise("1", FORMS)).to.equal("casă");
	});

	it("returns the singular form when the quantity is 0.", () => {
		expect(pluralise("0", FORMS)).to.equal("case");
	});

	it("returns the singular form when the quantity is -1.", () => {
		expect(pluralise("-1", FORMS)).to.equal("casă");
	});

	it("returns the short plural form when the quantity is 2 or more.", () => {
		expect(pluralise("2", FORMS)).to.equal("case");
	});

	it("returns the short plural form when the quantity is -2 or less.", () => {
		expect(pluralise("-2", FORMS)).to.equal("case");
	});

	it("returns the long plural form when the quantity is 20 or more.", () => {
		expect(pluralise("20", FORMS)).to.equal("de case");
	});

	it("returns the long plural form when the quantity is -20 or less.", () => {
		expect(pluralise("-20", FORMS)).to.equal("de case");
	});
});

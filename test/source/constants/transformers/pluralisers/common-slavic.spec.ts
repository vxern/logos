import { describe, it } from "bun:test";
import pluralise from "logos:constants/transformers/pluralisers/common-slavic";
import { expect } from "chai";

const FORMS = { one: "dom", two: "domy", many: "domów" };

describe("pluralise()", () => {
	it("returns undefined if the passed object does not contain forms `one`, `two` and `many`.", () => {
		expect(pluralise("0", {})).to.be.undefined;
		expect(pluralise("1", { one: "dom" })).to.be.undefined;
		expect(pluralise("2", { one: "dom", two: "domy" })).to.be.undefined;
		expect(pluralise("2", { two: "domy" })).to.be.undefined;
		expect(pluralise("5", { two: "domy", many: "domów" })).to.be.undefined;
		expect(pluralise("5", { many: "domów" })).to.be.undefined;
	});

	it("does not return undefined when the passed object contains forms `one`, `two` and `many`.", () => {
		expect(pluralise("5", FORMS)).to.not.be.undefined;
	});

	it("returns the singular form when the quantity is 1.", () => {
		expect(pluralise("1", FORMS)).to.equal("dom");
	});

	it("returns the genitive plural form when the quantity is 0.", () => {
		expect(pluralise("0", FORMS)).to.equal("domów");
	});

	it("returns the singular form when the quantity is -1.", () => {
		expect(pluralise("1", FORMS)).to.equal("dom");
	});

	it("returns the nominative plural form when the quantity is 2, 3 or 4.", () => {
		expect(pluralise("2", FORMS)).to.equal("domy");
		expect(pluralise("3", FORMS)).to.equal("domy");
		expect(pluralise("4", FORMS)).to.equal("domy");
	});

	it("returns the nominative plural form when the quantity is -2, -3 or -4.", () => {
		expect(pluralise("-2", FORMS)).to.equal("domy");
		expect(pluralise("-3", FORMS)).to.equal("domy");
		expect(pluralise("-4", FORMS)).to.equal("domy");
	});

	it("returns the genitive plural form when the quantity is 5 or more.", () => {
		expect(pluralise("5", FORMS)).to.equal("domów");
		expect(pluralise("6", FORMS)).to.equal("domów");
	});

	it("returns the genitive plural form when the quantity is -5 or less.", () => {
		expect(pluralise("-5", FORMS)).to.equal("domów");
		expect(pluralise("-6", FORMS)).to.equal("domów");
	});

	it("returns the genitive plural form when the quantity is 12, 13 or 14.", () => {
		expect(pluralise("12", FORMS)).to.equal("domów");
		expect(pluralise("13", FORMS)).to.equal("domów");
		expect(pluralise("14", FORMS)).to.equal("domów");
	});

	it("returns the genitive plural form when the quantity is -12, -13 or -14.", () => {
		expect(pluralise("-12", FORMS)).to.equal("domów");
		expect(pluralise("-13", FORMS)).to.equal("domów");
		expect(pluralise("-14", FORMS)).to.equal("domów");
	});

	it("returns the nominative plural form when the quantity ends in 2, 3 or 4 for numbers larger than 14.", () => {
		expect(pluralise("22", FORMS)).to.equal("domy");
		expect(pluralise("23", FORMS)).to.equal("domy");
		expect(pluralise("24", FORMS)).to.equal("domy");
		expect(pluralise("32", FORMS)).to.equal("domy");
		expect(pluralise("33", FORMS)).to.equal("domy");
		expect(pluralise("34", FORMS)).to.equal("domy");
	});

	it("returns the nominative plural form when the quantity ends in 2, 3 or 4 for numbers smaller than -14.", () => {
		expect(pluralise("-22", FORMS)).to.equal("domy");
		expect(pluralise("-23", FORMS)).to.equal("domy");
		expect(pluralise("-24", FORMS)).to.equal("domy");
		expect(pluralise("-32", FORMS)).to.equal("domy");
		expect(pluralise("-33", FORMS)).to.equal("domy");
		expect(pluralise("-34", FORMS)).to.equal("domy");
	});
});

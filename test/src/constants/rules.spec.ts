import { describe, it } from "bun:test";
import rules, { isValidRule } from "logos:constants/rules";
import { expect } from "chai";

describe("The rules object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(rules)).to.be.true;
	});
});

describe("isValidRule()", () => {
	it("returns true if the passed string is a valid rule", () => {
		expect(isValidRule("adherence")).to.be.true;
	});

	it("returns false if the passed string is not a valid rule", () => {
		expect(isValidRule("this-is-not-a-valid-rule")).to.be.false;
	});
});

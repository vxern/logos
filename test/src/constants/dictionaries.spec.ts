import { describe, it } from "bun:test";
import dictionaries from "logos:constants/dictionaries";
import { expect } from "chai";

describe("The dictionaries object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(dictionaries)).to.be.true;
	});
});

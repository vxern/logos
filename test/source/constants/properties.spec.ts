import { describe, it } from "bun:test";
import properties from "logos:constants/properties";
import { expect } from "chai";

describe("The properties object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(properties)).to.be.true;
	});
});

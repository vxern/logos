import { describe, it } from "bun:test";
import keys from "logos:constants/keys";
import { expect } from "chai";

describe("The keys object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(keys)).to.be.true;
	});
});

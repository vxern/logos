import { describe, it } from "bun:test";
import special from "logos:constants/special";
import { expect } from "chai";

describe("The special object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(special)).to.be.true;
	});
});

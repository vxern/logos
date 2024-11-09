import { describe, it } from "bun:test";
import pluralisers from "logos:constants/transformers/pluralisers";
import { expect } from "chai";

describe("The pluralisers object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(pluralisers)).to.be.true;
	});
});

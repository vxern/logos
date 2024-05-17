import { describe, it } from "bun:test";
import contexts from "logos:constants/contexts";
import { expect } from "chai";

describe("The contexts object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(contexts)).to.be.true;
	});
});

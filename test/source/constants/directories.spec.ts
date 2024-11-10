import { describe, it } from "bun:test";
import directories from "logos:constants/directories";
import { expect } from "chai";

describe("The directories object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(directories)).to.be.true;
	});
});

import { describe, it } from "bun:test";
import acknowledgements from "logos:constants/acknowledgements";
import { expect } from "chai";

describe("The acknowledgements object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(acknowledgements)).to.be.true;
	});
});

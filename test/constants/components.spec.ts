import components from "logos:constants/components";
import { expect } from "chai";

describe("The components object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(components)).to.be.true;
	});
});

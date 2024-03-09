import { expect } from "chai";
import components from "../../src/constants/components";

describe("The components object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(components)).to.be.true;
	});
});

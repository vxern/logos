import { expect } from "chai";
import properties from "../../src/constants/properties";

describe("The properties object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(properties)).to.be.true;
	});
});

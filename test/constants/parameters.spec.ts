import { expect } from "chai";
import parameters from "../../src/constants/parameters";

describe("The parameters object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(parameters)).to.be.true;
	});
});

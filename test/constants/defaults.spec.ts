import { expect } from "chai";
import defaults from "../../src/constants/defaults";

describe("The defaults object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(defaults)).to.be.true;
	});
});

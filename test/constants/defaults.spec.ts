import defaults from "logos:constants/defaults";
import { expect } from "chai";

describe("The defaults object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(defaults)).to.be.true;
	});
});

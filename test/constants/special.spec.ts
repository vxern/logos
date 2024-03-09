import { expect } from "chai";
import special from "../../src/constants/special";

describe("The special object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(special)).to.be.true;
	});
});

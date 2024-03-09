import { expect } from "chai";
import endpoints from "../../src/constants/endpoints";

describe("The endpoints object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(endpoints)).to.be.true;
	});
});

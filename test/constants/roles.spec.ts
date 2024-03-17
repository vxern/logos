import { expect } from "chai";
import roles from "../../src/constants/roles";

describe("The roles object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(roles)).to.be.true;
	});
});

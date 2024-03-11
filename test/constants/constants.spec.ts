import { expect } from "chai";
import constants from "../../src/constants/constants";

describe("The constants object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(constants)).to.be.true;
	});
});

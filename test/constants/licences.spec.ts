import { expect } from "chai";
import licences from "../../src/constants/licences";

describe("The licences object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(licences)).to.be.true;
	});
});

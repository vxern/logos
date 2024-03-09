import { expect } from "chai";
import acknowledgements from "../../src/constants/acknowledgements";

describe("The acknowledgements object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(acknowledgements)).to.be.true;
	});
});

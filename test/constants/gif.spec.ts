import { expect } from "chai";
import gifs from "../../src/constants/gifs";

describe("The GIF object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(gifs)).to.be.true;
	});
});

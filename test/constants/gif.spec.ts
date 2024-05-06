import gifs from "logos:constants/gifs";
import { expect } from "chai";

describe("The GIF object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(gifs)).to.be.true;
	});
});

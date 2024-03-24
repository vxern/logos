import emojis from "logos:constants/emojis";
import { expect } from "chai";

describe("The emojis object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(emojis)).to.be.true;
	});
});

describe("getEmojiBySongListingType()", () => {
	// TODO(vxern): Add tests.
});

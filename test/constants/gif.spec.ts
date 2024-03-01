import gifs from "../../src/constants/gifs";

describe("The GIF object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(gifs)).toBe(true);
	});
});

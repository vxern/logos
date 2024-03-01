import mit from "../../../src/constants/licences/mit";

const NOTICE = "this-is-the-passed-copyright-notice";

describe("The generator", () => {
	it("returns parts of the MIT licence that are each no more than 1024 characters long.", () => {
		const parts = mit("This is a sample copyright, 2024");
		expect(parts.every((part) => part.length <= 1024)).toBe(true);
	});

	it("returns at least one part containing the passed copyright notice.", () => {
		const parts = mit(NOTICE);
		expect(parts.some((part) => part.includes(NOTICE))).toBe(true);
	});
});

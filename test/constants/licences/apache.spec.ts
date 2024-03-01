import apache from "../../../src/constants/licences/apache";

const NOTICE = "this-is-the-passed-copyright-notice";

describe("The generator", () => {
	it("returns parts of the Apache licence that are each no more than 1024 characters long.", () => {
		const parts = apache("This is a sample copyright, 2024");
		expect(parts.every((part) => part.length <= 1024)).toBe(true);
	});

	it("returns at least one part containing the passed copyright notice.", () => {
		const parts = apache(NOTICE);
		expect(parts.some((part) => part.includes(NOTICE))).toBe(true);
	});
});

import contributions, { contributors } from "../../src/constants/contributions";

describe("The contributions object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(contributions)).toBe(true);
	});
});

describe("The contributors object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(contributors)).toBe(true);
	});
});

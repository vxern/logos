import { expect } from "chai";
import contributions, { contributors } from "../../src/constants/contributions";

describe("The contributions object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(contributions)).to.be.true;
	});
});

describe("The contributors object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(contributors)).to.be.true;
	});
});

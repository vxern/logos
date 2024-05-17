import { describe, it } from "bun:test";
import contributions, { contributors } from "logos:constants/contributions";
import { expect } from "chai";

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

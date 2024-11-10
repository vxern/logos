import { describe, it } from "bun:test";
import slowmode, {
	getSlowmodeDelayByLevel,
	getSlowmodeLevelByDelay,
	isValidSlowmodeLevel,
} from "logos:constants/slowmode";
import { expect } from "chai";

describe("The slowmode object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(slowmode)).to.be.true;
	});
});

describe("isValidSlowmodeLevel()", () => {
	it("returns true when the passed string is a valid slowmode level.", () => {
		for (const level of slowmode.levels) {
			expect(isValidSlowmodeLevel(level)).to.be.true;
		}
	});

	it("returns false when the passed string is not a valid slowmode level.", () => {
		expect(isValidSlowmodeLevel("this.is.not.a.slowmode.level")).to.be.false;
	});
});

describe("getSlowmodeDelayByLevel()", () => {
	it("should return the slowmode delay for its level.", () => {
		expect(getSlowmodeDelayByLevel("high")).to.equal(60); // 1 minute in seconds
	});
});

describe("getSlowmodeLevelByDelay()", () => {
	it("should return the level corresponding to the slowmode delay.", () => {
		expect(getSlowmodeLevelByDelay(60)).to.equal("high"); // 1 minute in seconds
	});
});

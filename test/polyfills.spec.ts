import { expect } from "chai";
import { registerPolyfills } from "../src/polyfills";
import "../src/types.d.ts";

describe("registerPolyfills()", () => {
	it("registers polyfills.", () => {
		registerPolyfills();
		expect(typeof Promise.withResolvers).to.not.equal("undefined");
	});

	it("registers globals.", () => {
		registerPolyfills();
		expect(typeof Discord).to.not.equal("undefined");
		expect(typeof constants).to.not.equal("undefined");
		expect(typeof defaults).to.not.equal("undefined");
	});
});

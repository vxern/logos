import { describe, it } from "bun:test";
import partsOfSpeech from "logos:constants/defaults";
import { expect } from "chai";

describe("The parts of speech object", () => {
    it("is immutable.", () => {
        expect(Object.isFrozen(partsOfSpeech)).to.be.true;
    });
});

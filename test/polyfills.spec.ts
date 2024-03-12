import {expect} from "chai";
import {registerPolyfills} from "../src/polyfills";

// TODO(vxern): Is checking for throws really the best way to do it?
describe("registerPolyfills()", () => {
    it("implements Promise.withResolvers().", () => {
        expect(() => Promise.withResolvers()).to.throw;
        registerPolyfills();
        expect(() => Promise.withResolvers()).to.not.throw;
    });

    describe("exposes globals.", () => {
        expect(() => Discord).to.throw;
        expect(() => constants).to.throw;
        expect(() => defaults).to.throw;
        registerPolyfills();
        expect(() => Discord).to.not.throw;
        expect(() => constants).to.not.throw;
        expect(() => defaults).to.not.throw;
    });
});
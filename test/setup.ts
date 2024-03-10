import log from "loglevel";
import { registerPolyfills } from "../src/polyfills";

registerPolyfills();

// Silence logs to prevent undesired messages being shown during testing.
log.disableAll();

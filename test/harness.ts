import log from "winston";

// Silence logs to prevent undesired messages being shown during testing.
log.configure({ silent: true });

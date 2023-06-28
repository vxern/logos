import reports from "./managers/reports.js";
import suggestions from "./managers/suggestions.js";
import verification from "./managers/verification.js";
import { ServiceStarter } from "../services.js";

const managers = [reports, suggestions, verification];

const service: ServiceStarter = ([client, bot]) => {
	for (const manager of managers) {
		manager.start([client, bot]);
	}
};

export default service;

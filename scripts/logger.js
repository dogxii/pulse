/**
 * Logger Utility
 *
 * Provides a consistent logging interface with support for different log levels.
 */

export const createLogger = () => {
	const log = (level, ...messages) => {
		if (typeof console !== "undefined" && console[level]) {
			console[level](...messages);
		}
	};

	return {
		info: (...messages) => log("info", ...messages),
		warn: (...messages) => log("warn", ...messages),
		error: (...messages) => log("error", ...messages),
	};
};

const logger = createLogger();
export default logger;

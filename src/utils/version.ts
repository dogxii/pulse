// 版本工具
// 提供应用版本号访问

/**
 * 获取应用版本号
 * 版本号在构建时从 package.json 注入
 */
export function getVersion(): string {
	return __APP_VERSION__;
}

/**
 * 获取版本信息对象
 */
export function getVersionInfo(): {
	version: string;
	major: number;
	minor: number;
	patch: number;
} {
	const version = getVersion();
	const parts = version.split(".").map((p) => parseInt(p, 10) || 0);

	return {
		version,
		major: parts[0] ?? 0,
		minor: parts[1] ?? 0,
		patch: parts[2] ?? 0,
	};
}

/**
 * 比较两个版本号
 * 返回: 1 (a > b), -1 (a < b), 0 (a == b)
 */
export function compareVersions(a: string, b: string): number {
	const partsA = a.split(".").map((p) => parseInt(p, 10) || 0);
	const partsB = b.split(".").map((p) => parseInt(p, 10) || 0);

	for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
		const numA = partsA[i] ?? 0;
		const numB = partsB[i] ?? 0;

		if (numA > numB) return 1;
		if (numA < numB) return -1;
	}

	return 0;
}

export default {
	getVersion,
	getVersionInfo,
	compareVersions,
};

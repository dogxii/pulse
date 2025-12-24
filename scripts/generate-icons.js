#!/usr/bin/env node

/**
 * PWA 图标生成脚本
 *
 * 这个脚本用于生成 PWA 所需的各种尺寸图标
 * 需要安装 sharp 依赖: npm install sharp --save-dev
 *
 * 使用方法:
 *   node scripts/generate-icons.js
 *
 * 或者使用在线工具:
 *   https://www.pwabuilder.com/imageGenerator
 *   https://realfavicongenerator.net/
 */

const fs = require("fs");
const path = require("path");

// 图标尺寸
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// 图标目录
const ICONS_DIR = path.join(__dirname, "../public/icons");

// 确保目录存在
if (!fs.existsSync(ICONS_DIR)) {
	fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// 生成 SVG 占位图标
function generatePlaceholderSvg(size) {
	// 使用与 favicon.svg 类似的图标
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <rect width="24" height="24" rx="4" fill="#10b981"/>
  <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

// 检查是否安装了 sharp
async function checkSharp() {
	try {
		require.resolve("sharp");
		return true;
	} catch (e) {
		return false;
	}
}

// 使用 sharp 生成 PNG 图标
async function generatePngIcons() {
	const sharp = require("sharp");
	const inputSvg = path.join(__dirname, "../public/favicon.svg");

	// 检查输入文件是否存在
	if (!fs.existsSync(inputSvg)) {
		console.error("Error: favicon.svg not found");
		process.exit(1);
	}

	console.log("Generating PWA icons...\n");

	for (const size of ICON_SIZES) {
		const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);

		try {
			await sharp(inputSvg)
				.resize(size, size, {
					fit: "contain",
					background: { r: 16, g: 185, b: 129, alpha: 1 }, // #10b981
				})
				.png()
				.toFile(outputPath);

			console.log(`✓ Generated: icon-${size}x${size}.png`);
		} catch (err) {
			console.error(
				`✗ Failed to generate icon-${size}x${size}.png:`,
				err.message,
			);
		}
	}

	console.log("\nDone! Icons generated in public/icons/");
}

// 生成 SVG 占位图标（不需要 sharp）
function generateSvgPlaceholders() {
	console.log("Sharp not installed. Generating SVG placeholders...\n");
	console.log("To generate proper PNG icons, install sharp:");
	console.log("  npm install sharp --save-dev\n");

	for (const size of ICON_SIZES) {
		const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.svg`);
		const svg = generatePlaceholderSvg(size);

		fs.writeFileSync(outputPath, svg);
		console.log(`✓ Generated placeholder: icon-${size}x${size}.svg`);
	}

	console.log("\nNote: SVG placeholders have been generated.");
	console.log("For production, please generate proper PNG icons using:");
	console.log("  - https://www.pwabuilder.com/imageGenerator");
	console.log("  - https://realfavicongenerator.net/");
}

// 主函数
async function main() {
	console.log("=== Pulse PWA Icon Generator ===\n");

	const hasSharp = await checkSharp();

	if (hasSharp) {
		await generatePngIcons();
	} else {
		generateSvgPlaceholders();
	}
}

main().catch(console.error);

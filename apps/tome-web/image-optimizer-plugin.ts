import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Plugin } from 'vite';

import { IMAGE_COMPRESS_EXTENSIONS, IMAGE_COMPRESS_FORMATS, IMAGE_SIZE_VARIANTS } from './app/lib/image';

export function compressImagesPlugin(): Plugin {
	return {
		name: 'vite-plugin-compress-images',
		enforce: 'post',
		apply: 'build',

		configureServer(server) {
			server.watcher.add(path.resolve(process.cwd(), 'public'));
		},

		async generateBundle(opts) {
			const publicDir = path.resolve(process.cwd(), 'public');
			const pngFiles = await findFilesWithExts(publicDir, IMAGE_COMPRESS_EXTENSIONS);
			if (opts.dir?.includes('/server')) return;
			const outDir = opts.dir || path.resolve(process.cwd(), 'dist');

			for (const file of pngFiles) {
				await compressAndGenerateVariants(file, publicDir, outDir);
			}
		},
	};
}

async function findFilesWithExts(dir: string, exts: string[]) {
	const files = await fs.promises.readdir(dir);
	const pngFiles: string[] = [];

	for (const file of files) {
		const filePath = path.join(dir, file);
		const stats = await fs.promises.stat(filePath);

		if (stats.isDirectory()) {
			pngFiles.push(...(await findFilesWithExts(filePath, exts)));
		} else if (exts.includes(path.extname(filePath).toLowerCase())) {
			pngFiles.push(filePath);
		}
	}

	return pngFiles;
}

async function compressAndGenerateVariants(filePath: string, publicDir: string, outDir: string) {
	const baseName = path.basename(filePath, '.png');
	const dirName = path.dirname(filePath);
	const dir = dirName.replace(publicDir, outDir);

	for (const fn of IMAGE_COMPRESS_FORMATS) {
		const img = sharp(filePath);
		const metadata = await img.metadata();
		const webp = await img[fn]({ quality: 85 }).toBuffer();
		await fs.promises.writeFile(`${dir}/${baseName}.webp`, webp);

		if (metadata.width && metadata.width > Math.max(...IMAGE_SIZE_VARIANTS)) {
			for (const size of IMAGE_SIZE_VARIANTS) {
				const resized = await img.resize(size, null)[fn]().toBuffer();
				await fs.promises.writeFile(path.join(dir, `${baseName}_${size}.webp`), resized);
			}
		}
	}
}

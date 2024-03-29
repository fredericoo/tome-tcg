import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Plugin } from 'vite';

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
			const pngFiles = await findPngFiles(publicDir);
			const outDir = opts.dir || path.resolve(process.cwd(), 'dist');

			console.log('pngFiles', pngFiles);
			for (const file of pngFiles) {
				await compressAndGenerateVariants(file, publicDir, outDir);
			}
		},
	};
}

async function findPngFiles(dir: string) {
	const files = await fs.promises.readdir(dir);
	const pngFiles: string[] = [];

	for (const file of files) {
		const filePath = path.join(dir, file);
		const stats = await fs.promises.stat(filePath);

		if (stats.isDirectory()) {
			pngFiles.push(...(await findPngFiles(filePath)));
		} else if (path.extname(filePath).toLowerCase() === '.png') {
			pngFiles.push(filePath);
		}
	}

	return pngFiles;
}

async function compressAndGenerateVariants(filePath: string, publicDir: string, outDir: string) {
	const baseName = path.basename(filePath, '.png');
	const dirName = path.dirname(filePath);
	const dir = dirName.replace(publicDir, outDir);

	const compressedPng = await sharp(filePath).png({ quality: 80 }).toBuffer();
	const webp = await sharp(filePath).webp({ quality: 100 }).toBuffer();
	const avif = await sharp(filePath).avif({ quality: 100 }).toBuffer();

	await fs.promises.writeFile(`${dir}/${baseName}.png`, compressedPng);
	await fs.promises.writeFile(`${dir}/${baseName}.webp`, webp);
	await fs.promises.writeFile(`${dir}/${baseName}.avif`, avif);
}

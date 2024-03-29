import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import { compressImagesPlugin } from './image-optimizer-plugin';

export default defineConfig({
	plugins: [
		remix({
			ssr: false,
		}),
		tsconfigPaths(),
		compressImagesPlugin(),
	],
});

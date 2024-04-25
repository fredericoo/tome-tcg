import { RemixBrowser } from '@remix-run/react';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { cacheAssets } from 'remix-utils/cache-assets';

cacheAssets({ cacheName: 'assets', buildPath: '/build/' })
	.then(() => {
		console.log('Assets cached');
	})
	.catch(error => {
		console.error('Error caching assets:', error);
	});

startTransition(() => {
	hydrateRoot(
		document,
		<StrictMode>
			<RemixBrowser />
		</StrictMode>,
	);
});

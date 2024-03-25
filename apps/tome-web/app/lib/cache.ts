import { createSWR } from 'swr-loader';
import { createIDBAdapter } from 'swr-loader/adapters/idb';
import { createMemoryAdapter } from 'swr-loader/adapters/memory';

// const idbAdapter = createIDBAdapter({ dbName: 'demo', storeName: 'data_cache' });
// const zustandAdapter = createZustandAdapter({ createStore });

export const { swr, invalidate } = createSWR({
	cacheAdapter:
		typeof indexedDB !== 'undefined' ?
			createIDBAdapter({ dbName: 'tome', storeName: 'api-cache' })
		:	createMemoryAdapter(),
});

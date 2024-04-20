import React from 'react';
import { StoreApi, UseBoundStore } from 'zustand';

export const createZustandContext = <TInitial, TStore extends UseBoundStore<StoreApi<any>>>(
	getStore: (initial: TInitial) => TStore,
) => {
	const Context = React.createContext<TStore | null>(null);

	const Provider = (props: { children?: React.ReactNode; initialValue: TInitial }) => {
		const [store] = React.useState(() => getStore(props.initialValue));
		return <Context.Provider value={store}>{props.children}</Context.Provider>;
	};

	return {
		useContext: ((selector: Parameters<TStore>[0]) => {
			const store = React.useContext(Context);
			if (store === null) {
				console.error('Missing provider for context:', Context);
				throw new Error('Missing provider for context');
			}
			return store(selector);
		}) as TStore,
		Context,
		Provider,
	};
};

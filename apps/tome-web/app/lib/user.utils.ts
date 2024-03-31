import { useRouteLoaderData } from '@remix-run/react';

import { NavLoader } from '../routes/_nav';

export const getInitials = (name: string | string[]) => {
	const flatName = Array.isArray(name) ? name.join(' ') : name;

	const initials = flatName
		.trim()
		.split(' ')
		.map(name => name[0]?.toLocaleUpperCase())
		.filter(Boolean);

	return [initials.shift(), initials.pop()].join('');
};

export const useNavLoaderData = () => {
	const data = useRouteLoaderData<NavLoader>('routes/_nav');
	if (!data) throw new Error('Please move the current route inside the _nav layout.');
	return data;
};

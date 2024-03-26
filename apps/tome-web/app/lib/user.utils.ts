export const getInitials = (name: string | string[]) => {
	const flatName = Array.isArray(name) ? name.join(' ') : name;

	const initials = flatName
		.trim()
		.split(' ')
		.map(name => name[0]?.toLocaleUpperCase())
		.filter(Boolean);

	return [initials.shift(), initials.pop()].join('');
};

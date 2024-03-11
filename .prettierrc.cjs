module.exports = {
	arrowParens: 'avoid',
	printWidth: 120,
	useTabs: true,
	singleQuote: true,
	endOfLine: 'auto',
	plugins: ['@trivago/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],
	importOrder: ['<THIRD_PARTY_MODULES>', '^[./]'],
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
	experimentalTernaries: true,
};

/*eslint-env node */
/** @type {import('eslint').Linter.Config} */
module.exports = {
	root: true,
	// This tells ESLint to load the config from the package `eslint-config-custom`
	extends: ['custom'],
	plugins: [],
	env: { browser: true, es2020: true },
	parserOptions: { project: ['./tsconfig.json'], tsconfigRootDir: __dirname },
};

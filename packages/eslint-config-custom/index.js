/** @type {import('eslint').Linter.Config} */
module.exports = {
	parser: '@typescript-eslint/parser',
	extends: [
		'turbo',
		'prettier',
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:import/typescript',
	],
	plugins: ['@typescript-eslint', 'unused-imports', 'import'],
	rules: {
		/** Prettier uses spaces to align enums in TS */
		'no-mixed-spaces-and-tabs': 'off',

		'@typescript-eslint/no-explicit-any': 'off',

		/** No absolute imports */
		'import/no-absolute-path': 'error',

		/** Ensures all imports appear before other statements */
		'import/first': ['error'],

		/** Ensures there’s an empty line between imports and other statements */
		'import/newline-after-import': ['warn', { count: 1 }],

		/** We only use namespaces in our generated types and those are not in our control */
		'@typescript-eslint/no-namespace': 'off',

		/** Ensures no unused imports are present, and only _ prefixed variables can be unused */
		'no-unused-vars': 'off',
		'unused-imports/no-unused-vars': [
			'warn',
			{
				vars: 'all',
				varsIgnorePattern: '^_',
				args: 'after-used',
				argsIgnorePattern: '^_',
			},
		],
		'unused-imports/no-unused-imports': 'error',
		'@typescript-eslint/no-misused-promises': 'off',

		'no-restricted-syntax': [
			'warn',
			{
				selector: 'TSEnumDeclaration',
				message: 'Don’t declare enums! Use string literal unions instead, they’re safer and more ergonomic.',
			},
		],

		'@typescript-eslint/no-unnecessary-condition': 'warn',
		'@typescript-eslint/no-unnecessary-type-arguments': 'warn',
		'@typescript-eslint/prefer-for-of': 'warn',
		'@typescript-eslint/prefer-function-type': 'warn',

		'@typescript-eslint/no-confusing-non-null-assertion': 'error',

		/** Standardises arrays. Simple arrays use brackets, complex arrays uses generic syntax
		 * @example - ❌ `const foo: Array<string> = [];`
		 * @example - ✅ `const foo: string[] = [];`
		 * @example - ❌ `const foo: ReturnType<typeof bar>[] = [];`
		 * @example - ✅ `const foo: Array<ReturnType<typeof bar>> = [];`
		 */
		'@typescript-eslint/array-type': ['warn', { default: 'array-simple' }],

		/** Enforces generics on the cunstructor, not as type annotation.
		 * @example - ❌ `const foo: Foo<string> = new Foo();`
		 * @example - ✅ `const foo = new Foo<string>();`
		 */
		'@typescript-eslint/consistent-generic-constructors': ['warn', 'constructor'],

		/** Already handled by unused-imports */
		'@typescript-eslint/no-unused-vars': 'off',

		/** React uses that a lot */
		'@typescript-eslint/unbound-method': 'off',

		'@typescript-eslint/ban-ts-comment': [
			'error',
			{
				'ts-expect-error': 'allow-with-description',
				'ts-ignore': true,
				'ts-nocheck': true,
				'ts-check': false,
				minimumDescriptionLength: 5,
			},
		],

		'no-restricted-imports': [
			'error',
			{
				paths: [
					/** Prevents us from using global lodash imports that break tree-shaking */
					{
						name: 'lodash',
						message: 'Import [module] from lodash/[module] instead',
					},
				],
			},
		],
	},
};

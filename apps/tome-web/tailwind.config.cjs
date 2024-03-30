/** @type {import("tailwindcss/plugin")} */
const plugin = require('tailwindcss/plugin');

const asCssVar = require('@inploi/design-tokens/tokens').asCssVar({});
/**
 * @param {keyof ReturnType<import("./app/lib/theme")['tokens']>} key
 */
const token = key => asCssVar('reference', key);

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./index.html', './app/**/*.{js,ts,jsx,tsx}'],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		fontFamily: {
			body: ['GT Walsheim Pro', 'sans-serif'],
			display: ['GT Walsheim Pro', 'sans-serif'],
		},

		extend: {
			colors: {
				neutral: {
					1: token('neutral-1'),
					2: token('neutral-2'),
					3: token('neutral-3'),
					4: token('neutral-4'),
					5: token('neutral-5'),
					6: token('neutral-6'),
					7: token('neutral-7'),
					8: token('neutral-8'),
					9: token('neutral-9'),
					10: token('neutral-10'),
					11: token('neutral-11'),
					12: token('neutral-12'),
				},
				accent: {
					1: token('accent-1'),
					2: token('accent-2'),
					3: token('accent-3'),
					4: token('accent-4'),
					5: token('accent-5'),
					6: token('accent-6'),
					7: token('accent-7'),
					8: token('accent-8'),
					9: token('accent-9'),
					10: token('accent-10'),
					11: token('accent-11'),
					12: token('accent-12'),
				},
				error: {
					1: token('error-1'),
					2: token('error-2'),
					3: token('error-3'),
					4: token('error-4'),
					5: token('error-5'),
					6: token('error-6'),
					7: token('error-7'),
					8: token('error-8'),
					9: token('error-9'),
					10: token('error-10'),
					11: token('error-11'),
					12: token('error-12'),
				},
			},
			keyframes: {
				'fade-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				'to-zero-width': {
					'0%': { width: '100%' },
					'100%': { width: '0%' },
				},
				'card-preview': {
					'0%': { transform: 'scale(0.9) translateY(-100%)' },
					'100%': { transform: 'scale(1) translateY(-100%)' },
				},
				'card-effect': {
					'0%, 100%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.1)' },
				},
				action: {
					'0%': { transform: 'scale(0.9)' },
					'100%': { transform: 'scale(1)' },
				},
			},
			animation: {
				'to-zero-width': 'to-zero-width 0.5s ease-out both',
				'card-preview': 'card-preview 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
				'card-effect': 'card-effect 0.3s cubic-bezier(0.16, 1, 0.3, 1) infinite',
				action: 'action 1.2s cubic-bezier(0.16, 1, 0.3, 1) both',
				'fade-in': 'fade-in 0.3s ease-out',
			},
		},
	},
	plugins: [
		require('tailwindcss-touch')(),
		plugin(({ addUtilities, matchUtilities }) => {
			const frStyles = {
				outline: 'none',
				'--tw-ring-offset-width': '2px',
				'--tw-ring-offset-color': 'white',
				'--tw-ring-offset-shadow': '0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)',
				'--tw-ring-opacity': '1',
				'--tw-ring-color': "theme('colors.accent.9')",
				'--tw-ring-shadow': 'var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color)',
				boxShadow: 'var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000)',
			};

			matchUtilities(
				{
					'text-wrap': value => ({
						textWrap: value,
					}),
				},
				{ values: { balance: 'balance', pretty: 'pretty' } },
			);

			addUtilities({
				'.fr': {
					outline: 'none',
					'&:focus': {
						outline: 'none',
					},
					'&:focus-visible': frStyles,
				},
				'.gutter-stable': {
					'scrollbar-gutter': 'stable',
				},
				'.hide-scrollbars': {
					'&::-webkit-scrollbar': {
						display: 'none',
					},
					scrollbarWidth: 'none',
					'-ms-overflow-style': 'none',
				},
				'.touch-hitbox': {
					'&::before': {
						content: "''",
						position: 'absolute',
						display: 'block',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						width: '100%',
						height: '100%',
						minHeight: '44px',
						minWidth: '44px',
						zIndex: '9999',
					},
				},
			});
		}),
	],
};

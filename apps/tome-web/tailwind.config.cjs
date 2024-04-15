/** @type {import("tailwindcss/plugin")} */
const plugin = require('tailwindcss/plugin');

const asCssVar = require('@inploi/design-tokens/tokens').asCssVar({});
/**
 * @param {keyof ReturnType<import("./app/lib/theme")['tokens']>} key
 */
const token = key => `oklch(${asCssVar('reference', key)} / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./index.html', './app/**/*.{js,ts,jsx,tsx}'],
	theme: {
		container: {
			center: true,
			padding: '1rem',
			screens: {
				'2xl': '1400px',
			},
		},
		fontFamily: {
			body: ['GT Walsheim Pro', 'sans-serif'],
			display: ['GT Walsheim Pro', 'sans-serif'],
		},

		fontWeight: {
			regular: '400',
			medium: '500',
			bold: '700',
		},
		letterSpacing: {
			tighter: '-0.03em',
			tight: '-0.01em',
			normal: '0',
			wide: '0.025em',
			wider: '0.05em',
			widest: '0.06em',
		},

		borderRadius: {
			1: '0.25rem',
			2: '0.5rem',
			3: '0.75rem',
			4: '1rem',
			5: '1.25rem',
			6: '1.5rem',
			7: '1.75rem',
			8: '2rem',
			12: '3rem',
			16: '4rem',
			full: '9999px',
		},

		colors: {
			current: 'currentColor',
			white: token('white'),
			black: token('black'),
			lowest: token('lowest'),
			highest: token('highest'),
			border: token('neutral-4'),
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
			negative: {
				1: token('negative-1'),
				2: token('negative-2'),
				3: token('negative-3'),
				4: token('negative-4'),
				5: token('negative-5'),
				6: token('negative-6'),
				7: token('negative-7'),
				8: token('negative-8'),
				9: token('negative-9'),
				10: token('negative-10'),
				11: token('negative-11'),
				12: token('negative-12'),
			},
			positive: {
				1: token('positive-1'),
				2: token('positive-2'),
				3: token('positive-3'),
				4: token('positive-4'),
				5: token('positive-5'),
				6: token('positive-6'),
				7: token('positive-7'),
				8: token('positive-8'),
				9: token('positive-9'),
				10: token('positive-10'),
				11: token('positive-11'),
				12: token('positive-12'),
			},
			warning: {
				1: token('warning-1'),
				2: token('warning-2'),
				3: token('warning-3'),
				4: token('warning-4'),
				5: token('warning-5'),
				6: token('warning-6'),
				7: token('warning-7'),
				8: token('warning-8'),
				9: token('warning-9'),
				10: token('warning-10'),
				11: token('warning-11'),
				12: token('warning-12'),
			},
		},

		extend: {
			transitionTimingFunction: {
				'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
			},
			boxShadow: {
				'surface-sm':
					'0px 1px 1px 0px oklch(var(--tw-shadow-color) / 0.06), 0px 1px 1px 0px oklch(var(--tw-shadow-color) / 0.05), 0px 2px 2px 0px oklch(var(--tw-shadow-color) / 0.04), 0px 2px 2px 0px oklch(var(--tw-shadow-color) /0.03)',
				'surface-md':
					'0px 1px 1px 0px oklch(var(--tw-shadow-color) / 0.06), 0px 3px 3px 0px oklch(var(--tw-shadow-color) / 0.05), 0px 6px 4px 0px oklch(var(--tw-shadow-color) / 0.04), 0px 6px 4px 0px oklch(var(--tw-shadow-color) /0.01)',
				'surface-lg':
					'0px 1px 1px 0px oklch(var(--tw-shadow-color) / 0.06), 0px 3px 3px 0px oklch(var(--tw-shadow-color) / 0.05), 0px 6px 4px 0px oklch(var(--tw-shadow-color) / 0.04), 0px 11px 4px 0px oklch(var(--tw-shadow-color) /0.03), 0px 32px 24px -12px oklch(var(--tw-shadow-color) / 0.08)',
				'surface-inset': 'inset 0 1px 1px 0 rgba(0, 0, 0, 0.1)',
			},
			keyframes: {
				'fade-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				'to-zero-width': {
					to: { width: '0%' },
				},
				'card-preview': {
					'0%': { transform: 'translateX(-50%) scale(0.9) translateY(-100%)' },
					'100%': { transform: 'translateX(-50%) scale(1) translateY(-100%)' },
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
				'to-zero-width': 'to-zero-width 0.5s linear both',
				'card-preview': 'card-preview 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
				'card-effect': 'card-effect 0.3s cubic-bezier(0.16, 1, 0.3, 1) infinite',
				action: 'action 1.2s cubic-bezier(0.16, 1, 0.3, 1) both',
				'fade-in': 'fade-in 0.3s ease-out',
			},
		},
	},
	plugins: [
		require('@tailwindcss/container-queries'),
		require('tailwindcss-touch')(),
		require('./app/lib/style.typography').textStylesPlugin,
		plugin(({ addUtilities, matchUtilities }) => {
			const frStyles = {
				outline: 'none',
				'--tw-ring-offset-width': '2px',
				'--tw-ring-offset-color': "theme('colors.lowest')",
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

			matchUtilities(
				{
					surface: value => ({
						'--tw-shadow-color': `var(--${value}-11)`,
						'--surface-highlight': `var(--${value}-1)`,
					}),
				},
				{
					values: {
						positive: 'positive',
						negative: 'negative',
						neutral: 'neutral',
						accent: 'accent',
						warning: 'warning',
					},
				},
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

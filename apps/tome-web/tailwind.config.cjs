/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./index.html', './app/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			keyframes: {
				'to-zero-width': {
					'0%': { width: '100%' },
					'100%': { width: '0%' },
				},
			},
			animation: {
				'to-zero-width': 'to-zero-width 0.5s ease-out both',
			},
		},
	},
	plugins: [],
};

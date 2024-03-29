/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./index.html', './app/**/*.{js,ts,jsx,tsx}'],
	theme: {
		fontFamily: {
			body: ['GT Walsheim Pro', 'sans-serif'],
			display: ['GT Walsheim Pro', 'sans-serif'],
		},
		extend: {
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
	plugins: [],
};

import plugin from 'tailwindcss/plugin';

const SCALE_MULTIPLIER = 0.25;
const SCALE_UNIT = 'rem';

export const scale = (index: number) => ({
	value: index * SCALE_MULTIPLIER + SCALE_UNIT,
});

export const pxToRem = (px: number) => `${px / 16}rem`;

export const utilsPlugin = plugin(({ addUtilities }) => {
	addUtilities({
		'.touch-callout-none': {
			WebkitTouchCallout: 'none',
		},
		'.hide-scrollbars': {
			'&::-webkit-scrollbar': {
				display: 'none',
			},
			scrollbarWidth: 'none',
			'-ms-overflow-style': 'none',
		},
		'.touch-hitbox': {
			position: 'relative',
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
			},
		},

		'.gradient-smooth-fade': {
			'--tw-gradient-stops': `hsl(260 25% 11%) 0%,
			hsla(260 25% 11% / 0.987) 8.1%,
			hsla(260 25% 11% / 0.951) 15.5%,
			hsla(260 25% 11% / 0.896) 22.5%,
			hsla(260 25% 11% / 0.825) 29%,
			hsla(260 25% 11% / 0.741) 35.3%,
			hsla(260 25% 11% / 0.648) 41.2%,
			hsla(260 25% 11% / 0.55) 47.1%,
			hsla(260 25% 11% / 0.45) 52.9%,
			hsla(260 25% 11% / 0.352) 58.8%,
			hsla(260 25% 11% / 0.259) 64.7%,
			hsla(260 25% 11% / 0.175) 71%,
			hsla(260 25% 11% / 0.104) 77.5%,
			hsla(260 25% 11% / 0.049) 84.5%,
			hsla(260 25% 11% / 0.013) 91.9%,
			hsla(260 25% 11% / 0) 100%`,
		},
	});
});

import { generatePalette, sameAsInput } from '@inploi/design-tokens/color';
import { useMemo, useState } from 'react';

export const PaletteTool = () => {
	const [hue, setHue] = useState(0);
	const [chroma, setChroma] = useState(0);

	const palette = useMemo(() => {
		return generatePalette({ hue, mode: 'light', transform: sameAsInput, prefix: 'accent-', chroma });
	}, [chroma, hue]);

	return (
		<section>
			<input type="range" min="0" max="360" value={hue} onChange={e => setHue(Number(e.target.value))} />
			<input
				type="range"
				min="0"
				max="2"
				step={0.01}
				value={chroma}
				onChange={e => setChroma(Number(e.target.value))}
			/>
			<ul>
				{Object.values(palette).map(color => (
					<div key={color} style={{ backgroundColor: color }} className="h-8 w-8" />
				))}
			</ul>
		</section>
	);
};

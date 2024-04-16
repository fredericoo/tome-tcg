import { useEffect, useRef, useState } from 'react';

export const useMeasure = <T extends HTMLElement>() => {
	const ref = useRef<T>(null);
	const [boundingBox, setBoundingBox] = useState<{ clientWidth: number }>();

	useEffect(() => {
		const measure = () => ref.current && setBoundingBox({ clientWidth: ref.current.clientWidth });
		measure();
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	}, []);

	return [ref, boundingBox] as const;
};

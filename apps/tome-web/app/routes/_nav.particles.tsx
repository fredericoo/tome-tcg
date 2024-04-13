import { Form, useSearchParams, useSubmit } from '@remix-run/react';
import { IconPlayerPause, IconPlayerPlay, IconSettings } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { Button } from '../components/button';
import { VfxCanvas, useVfxStore } from '../components/game/vfx-canvas';
import { Input, InputProps } from '../components/input';
import { particleEffect } from '../lib/vfx';

const settings: Array<InputProps & { label: string; key: keyof Parameters<typeof particleEffect>[0]['config'] }> = [
	{
		key: 'direction',
		type: 'range',
		min: 0,
		max: 360,
		step: 1,
		name: 'direction',
		label: 'Direction',
		defaultValue: 0,
	},
	{
		key: 'directionVariance',
		type: 'range',
		min: 0,
		max: 360,
		step: 1,
		name: 'directionVariance',
		label: 'Direction variance',
		defaultValue: 360,
	},

	{ key: 'startTint', type: 'color', name: 'startTint', label: 'Start tint', defaultValue: '#ff0000' },
	{ key: 'endTint', type: 'color', name: 'endTint', label: 'End tint', defaultValue: '#ff0000' },

	{ key: 'maxParticles', type: 'number', name: 'maxParticles', label: 'Max particles', defaultValue: 100 },
	{ key: 'lifespan', type: 'number', name: 'lifespan', label: 'Lifespan', defaultValue: 20 },
	{ key: 'lifespanVariance', type: 'number', name: 'lifespanVariance', label: 'Lifespan variance', defaultValue: 10 },
	{ key: 'maxSpeed', type: 'number', name: 'maxSpeed', label: 'Max speed', defaultValue: 1 },
	{ key: 'minSpeed', type: 'number', name: 'minSpeed', label: 'Min speed', defaultValue: 0.5 },

	{
		key: 'startOpacity',
		type: 'range',
		min: 0,
		max: 1,
		step: 0.01,
		name: 'startOpacity',
		label: 'Start opacity',
		defaultValue: 1,
	},
	{
		key: 'endOpacity',
		type: 'range',
		min: 0,
		max: 1,
		step: 0.01,
		name: 'endOpacity',
		label: 'End opacity',
		defaultValue: 0,
	},

	{
		key: 'startScaleX',
		type: 'range',
		min: 0,
		max: 1,
		step: 0.01,
		name: 'startScaleX',
		label: 'Start scale X',
		defaultValue: 0.1,
	},
	{
		key: 'endScaleX',
		type: 'range',
		min: 0,
		max: 1,
		step: 0.01,
		name: 'endScaleX',
		label: 'End scale X',
		defaultValue: 0,
	},

	{
		key: 'startScaleY',
		type: 'range',
		min: 0,
		max: 1,
		step: 0.01,
		name: 'startScaleY',
		label: 'Start scale Y',
		defaultValue: 0.1,
	},
	{
		key: 'endScaleY',
		type: 'range',
		min: 0,
		max: 1,
		step: 0.01,
		name: 'endScaleY',
		label: 'End scale Y',
		defaultValue: 0,
	},

	{ key: 'scaleVariance', type: 'number', name: 'scaleVariance', label: 'Scale variance', defaultValue: 0.5 },

	{ key: 'xVariance', type: 'number', name: 'xVariance', label: 'X variance', defaultValue: 50 },
	{ key: 'yVariance', type: 'number', name: 'yVariance', label: 'Y variance', defaultValue: 20 },
];

export default function Page() {
	const [search] = useSearchParams();
	const app = useVfxStore(s => s.app);
	const defaultParticle = useVfxStore(s => s.defaultParticle);
	const [state, setState] = useState<'playing' | 'paused'>('playing');

	useEffect(() => {
		if (state !== 'playing') return;
		console.log('breakpoint', app);
		if (!defaultParticle) return;
		if (!app) return;

		const getPropertyOrFallback = <V,>(
			key: string,
			{ fallback, transform }: { transform?: (val: string) => V; fallback: V },
		) => {
			const value = search.get(key);
			try {
				if (!value) return fallback;
				const fn = transform ?? ((v: string) => +v);
				return fn?.(value);
			} catch (e) {
				return fallback;
			}
		};

		const { stop } = particleEffect({
			app,
			rect: {
				width: app.canvas.width,
				height: app.canvas.height,
				x: app.canvas.width / 2,
				y: app.canvas.height / 2,
			},
			texture: defaultParticle,
			config: {
				maxParticles: getPropertyOrFallback('maxParticles', { fallback: 100 }),
				lifespan: getPropertyOrFallback('lifespan', { fallback: 20 }),
				lifespanVariance: getPropertyOrFallback('lifespanVariance', { fallback: 10 }),
				minSpeed: getPropertyOrFallback('minSpeed', { fallback: 0.5 }),
				maxSpeed: getPropertyOrFallback('maxSpeed', { fallback: 1 }),
				startOpacity: getPropertyOrFallback('startOpacity', { fallback: 0.5 }),
				endOpacity: getPropertyOrFallback('endOpacity', { fallback: 0 }),
				startScaleX: getPropertyOrFallback('startScaleX', { fallback: 0.1 }),
				startScaleY: getPropertyOrFallback('startScaleY', { fallback: 0.1 }),
				scaleVariance: getPropertyOrFallback('scaleVariance', { fallback: 0.5 }),
				xVariance: getPropertyOrFallback('xVariance', { fallback: 50 }),
				yVariance: getPropertyOrFallback('yVariance', { fallback: 20 }),
				endScaleX: getPropertyOrFallback('endScaleX', { fallback: 0.5 }),
				endScaleY: getPropertyOrFallback('endScaleY', { fallback: 0.5 }),
				direction: getPropertyOrFallback('direction', { fallback: 0, transform: v => (+v * Math.PI) / 180 }),
				directionVariance: getPropertyOrFallback('directionVariance', {
					fallback: 360,
					transform: v => (+v * Math.PI) / 180,
				}),
				endTint: getPropertyOrFallback('endTint', {
					fallback: 0xff0000,
					transform: v => parseInt(v.replace('#', ''), 16),
				}),
				startTint: getPropertyOrFallback('startTint', {
					fallback: 0xff0000,
					transform: v => parseInt(v.replace('#', ''), 16),
				}),
			},
		});
		return stop;
	}, [app, defaultParticle, search, state]);

	const submit = useSubmit();

	return (
		<div className="flex gap-2 py-4">
			<section className="sticky top-20 flex flex-1 flex-col gap-2 self-start">
				<div className="bg-neutral-3 rounded-4  aspect-video w-full max-w-screen-lg">
					<VfxCanvas />
				</div>
				<nav className="flex gap-2">
					<Button variant="outline" onClick={() => setState(s => (s === 'paused' ? 'playing' : 'paused'))}>
						{state === 'paused' ?
							<IconPlayerPlay />
						:	<IconPlayerPause />}
					</Button>
				</nav>
			</section>
			<section className="bg-neutral-2 rounded-6 mx-auto flex w-full max-w-lg flex-col gap-2 p-2">
				<header className="flex gap-2 p-2">
					<IconSettings /> <h1 className="heading-sm">Particle generator settings</h1>
				</header>

				<Form onChange={e => submit(e.currentTarget, { preventScrollReset: true })}>
					<fieldset className="bg-lowest rounded-4 shadow-surface-md text-wrap surface-neutral ring-neutral-9/10 flex flex-col gap-4 p-4 ring-1">
						{settings.map(({ key, label, defaultValue, ...props }) => (
							<label key={key} htmlFor={key}>
								<span className="label-sm">{label}</span>

								<Input id={key} name={key} defaultValue={search.get(key) ?? defaultValue} {...props} />
							</label>
						))}
					</fieldset>
				</Form>
			</section>
		</div>
	);
}

import { Application, BlurFilter, Texture } from 'pixi.js';
import { useEffect, useRef } from 'react';
import { create } from 'zustand';

import { VfxEntity, VfxIteration } from '../../../../tome-api/src/features/engine/engine.vfx';
import { createParticle, particleEffect } from '../../lib/vfx';

type VfxStore = {
	app: Application | null;
	defaultParticle: Texture | null;
	setApp: (app: Application) => void;
	setdefaultParticle: (particle: Texture) => void;
};

// FIRE EFFECT PARTICLE CONFIG
// maxParticles: 50,
// 							lifespan: 25,
// 							lifespanVariance: 25,
// 							minSpeed: 1,
// 							maxSpeed: 4,
// 							startOpacity: 0.5,
// 							endOpacity: 1,
// 							startScale: 1,
// 							scaleVariance: 0.5,
// 							xVariance: 2,
// 							endScale: 0.1,
// 							direction: Math.PI,
// 							directionVariance: 0.1,
// 							startTint: 0xff6633,
// 							endTint: 0xffffff00,
// 							filters: [new BlurFilter({ strength: 10 })],

export const useVfxStore = create<VfxStore>(set => ({
	app: null,
	defaultParticle: null,
	setApp: app => set({ app }),
	setdefaultParticle: defaultParticle => set({ defaultParticle }),
}));

export const getVfxId = (entity: VfxEntity) => {
	switch (entity.type) {
		case 'card':
			return `card-${entity.cardKey}`;
		case 'player':
			return `player-${entity.side}`;
		case 'stack':
			return `stack-${entity.side}-${entity.stack}`;
	}
};

const getCenter = (rect: DOMRect) => ({
	x: rect.left + rect.width / 2,
	y: rect.top + rect.height / 2,
});

export const handleVfx = (vfx: VfxIteration) => {
	switch (vfx.type) {
		case 'highlight': {
			const { app, defaultParticle } = useVfxStore.getState();
			if (!app) {
				console.warn('effect triggered with vfx canvas not loaded');
				return;
			}
			const target = document.querySelector(`#${getVfxId(vfx.config.target)}`);
			if (!target) {
				console.warn('No target found for vfx', vfx.config.target);
				return;
			}
			const targetRect = target.getBoundingClientRect();
			const { x, y } = getCenter(targetRect);
			if (!defaultParticle) {
				console.warn('no default particle was created');
				return;
			}

			switch (vfx.config.type) {
				case 'effect': {
					const { stop } = particleEffect({
						app,
						rect: { width: targetRect.width, height: targetRect.width, x, y },
						texture: defaultParticle,
						config: {
							maxParticles: 50,
							lifespan: 25,
							lifespanVariance: 25,
							minSpeed: 1,
							maxSpeed: 4,
							startOpacity: 1,
							endOpacity: 1,
							startScaleX: 0.01,
							startScaleY: 0,
							scaleVariance: 0.5,
							xVariance: 0,
							endScaleX: 0,
							endScaleY: 1,
							direction: 0,
							directionVariance: Math.PI * 2,
							endTint: 0xffffff00,
							startTint: 0xfcad00,
							filters: [new BlurFilter({ strength: 10 })],
						},
					});
					setTimeout(stop, vfx.durationMs);
					return;
				}
				case 'hp_up': {
					const { stop } = particleEffect({
						app,
						rect: { width: targetRect.width, height: targetRect.width, x, y },
						texture: defaultParticle,
						config: {
							maxParticles: 100,
							lifespan: 25,
							lifespanVariance: 10,
							minSpeed: 0.5,
							maxSpeed: 1,
							startOpacity: 0.5,
							endOpacity: 0,
							startScaleX: 0.25,
							startScaleY: 0.25,
							scaleVariance: 0.5,
							xVariance: 50,
							yVariance: 20,
							endScaleX: 0.5,
							endScaleY: 0.5,
							direction: Math.PI,
							endTint: 0x00ffff,
							startTint: 0xccff33,
						},
					});
					setTimeout(stop, vfx.durationMs);
					break;
				}
				case 'hp_down': {
					const { stop } = particleEffect({
						app,
						rect: { width: targetRect.width, height: targetRect.width, x, y },
						texture: defaultParticle,
						config: {
							maxParticles: 100,
							lifespan: 25,
							lifespanVariance: 10,
							minSpeed: 0.5,
							maxSpeed: 1,
							startOpacity: 0.5,
							endOpacity: 0,
							startScaleX: 0.1,
							startScaleY: 0.1,
							scaleVariance: 0.5,
							xVariance: 50,
							yVariance: 20,
							endScaleX: 0.01,
							endScaleY: 0.5,
							direction: 0,
							directionVariance: Math.PI * 2,
							endTint: 0xff0000,
							startTint: 0xdd0000,
						},
					});
					setTimeout(stop, vfx.durationMs);
					break;
				}
				case 'positive': {
					const { stop } = particleEffect({
						app,
						rect: { width: targetRect.width, height: targetRect.width, x, y },
						texture: defaultParticle,
						config: {
							maxParticles: 100,
							lifespan: 25,
							lifespanVariance: 10,
							minSpeed: 0.5,
							maxSpeed: 1,
							startOpacity: 0.5,
							endOpacity: 0,
							startScaleX: 0.1,
							startScaleY: 0.1,
							scaleVariance: 0.5,
							xVariance: 50,
							yVariance: 20,
							endScaleX: 0.01,
							endScaleY: 0.5,
							direction: 0,
							directionVariance: Math.PI * 2,
							endTint: 0x00ff00,
							startTint: 0x00ff00,
						},
					});
					setTimeout(stop, vfx.durationMs);
					break;
				}
				case 'negative': {
					const { stop } = particleEffect({
						app,
						rect: { width: targetRect.width, height: targetRect.width, x, y },
						texture: defaultParticle,
						config: {
							maxParticles: 100,
							lifespan: 25,
							lifespanVariance: 10,
							minSpeed: 0.5,
							maxSpeed: 1,
							startOpacity: 0.5,
							endOpacity: 0,
							startScaleX: 0.1,
							startScaleY: 0.1,
							scaleVariance: 0.5,
							xVariance: 50,
							yVariance: 20,
							endScaleX: 0.01,
							endScaleY: 0.5,
							direction: 0,
							directionVariance: Math.PI * 2,
							endTint: 0xff0000,
							startTint: 0xff0000,
						},
					});
					setTimeout(stop, vfx.durationMs);
					break;
				}
				default:
					console.log(vfx.config.type, vfx.config.target);
			}
			break;
		}
		case 'attack':
			break;
		default:
			console.log('vfx', vfx);
	}
};

export const VfxCanvas = ({ boardRef }: { boardRef: HTMLElement | null }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const setApp = useVfxStore(s => s.setApp);
	const setDefaultParticle = useVfxStore(s => s.setdefaultParticle);
	useEffect(() => {
		const initCanvas = async () => {
			if (!boardRef) return;
			if (!canvasRef.current) return;
			const app = new Application();
			setApp(app);
			await app.init({ autoDensity: true, backgroundAlpha: 0, canvas: canvasRef.current, resizeTo: boardRef });
			setDefaultParticle(createParticle(app));
		};
		initCanvas();
		return () => {};
	}, [boardRef, setApp, setDefaultParticle]);

	return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-20"></canvas>;
};

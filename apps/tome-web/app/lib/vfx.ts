import { Application, Container, Filter, Graphics, Sprite, Texture } from 'pixi.js';

export const createParticle = (app: Application) => {
	const graphic = new Graphics().circle(0, 0, 20).fill(0xffffff);
	const texture = app.renderer.generateTexture(graphic);
	return texture;
};

type Particle = {
	sprite: Sprite;
	direction: number;
	speed: number;
	startScaleX: number;
	startScaleY: number;
	lifespan: number;
	maxLifespan: number;
	destroy: () => void;
};

const mix = (a: number, b: number, pos: number) => Math.round(a + (b - a) * pos);
function interpolateHex(color1: number, color2: number, position: number) {
	const r = mix((color1 >> 16) & 0xff, (color2 >> 16) & 0xff, position);
	const g = mix((color1 >> 8) & 0xff, (color2 >> 8) & 0xff, position);
	const b = mix(color1 & 0xff, color2 & 0xff, position);

	return (r << 16) | (g << 8) | b;
}
function interpolateNumber(a: number, b: number, pos: number) {
	return a + (b - a) * pos;
}

type ParticleEffectParams = {
	app: Application;
	rect: { width: number; height: number; x: number; y: number };
	texture: Texture;
	config: {
		xVariance?: number;
		yVariance?: number;
		startTint: number;
		endTint?: number;
		minSpeed: number;
		maxSpeed: number;
		maxParticles: number;
		lifespan: number;
		lifespanVariance?: number;
		startScaleX: number;
		endScaleX: number;
		startScaleY: number;
		endScaleY: number;
		scaleVariance?: number;
		startOpacity: number;
		endOpacity?: number;
		direction: number;
		directionVariance?: number;
		filters?: Filter[];
	};
};

export const particleEffect = ({ app, rect, texture, config }: ParticleEffectParams) => {
	let isDisposed = false;
	const sprites = new Container(rect);
	app.stage.addChild(sprites);
	const particles: Particle[] = [];
	const createParticle = () => {
		const lifespan = config.lifespan + (config.lifespanVariance ?? 0) * Math.random();
		const startScaleX = config.startScaleX + (config.scaleVariance ?? 0) * Math.random();
		const startScaleY = config.startScaleY + (config.scaleVariance ?? 0) * Math.random();
		const direction = config.direction + (Math.random() - 0.5) * Math.PI * 2 * (config.directionVariance ?? 0);
		const particle: Particle = {
			sprite: new Sprite({
				texture,
				x: (Math.random() - 0.5) * (config.xVariance ?? 0),
				y: (Math.random() - 0.5) * (config.yVariance ?? 0),
				anchor: 0.5,
				tint: config.startTint,
				scale: { x: startScaleX, y: startScaleY },
				filters: config.filters,
				rotation: -direction + Math.PI,
			}),
			direction,
			speed: config.minSpeed + Math.random() * config.maxSpeed,
			lifespan,
			startScaleX,
			startScaleY,
			maxLifespan: lifespan,
			destroy: () => {
				sprites.removeChild(particle.sprite);
				particle.sprite.destroy();
				particles.splice(particles.indexOf(particle), 1);
			},
		};
		particles.push(particle);
		sprites.addChild(particle.sprite);
		return particle;
	};

	function effectTicker() {
		if (!isDisposed) {
			if (particles.length < config.maxParticles) createParticle();
		}
		for (const particle of particles) {
			const delta = particle.lifespan / particle.maxLifespan;
			particle.lifespan -= 1 * app.ticker.deltaTime;
			particle.sprite.x += Math.sin(particle.direction) * particle.speed * app.ticker.deltaTime;
			particle.sprite.y += Math.cos(particle.direction) * particle.speed * app.ticker.deltaTime;
			if (config.endTint) {
				particle.sprite.tint = interpolateHex(config.endTint, config.startTint, delta);
			}
			if (config.endOpacity !== undefined)
				particle.sprite.alpha = interpolateNumber(config.endOpacity, config.startOpacity, delta);
			if (config.endScaleX !== undefined || config.endScaleY !== undefined)
				particle.sprite.scale.set(
					interpolateNumber(config.endScaleX ?? 1, particle.startScaleX, delta),
					interpolateNumber(config.endScaleY ?? 1, particle.startScaleY, delta),
				);
			if (particle.lifespan <= 0) particle.destroy();
		}
		if (particles.length === 0) destroy();
	}

	app.ticker.add(effectTicker);
	const destroy = () => {
		app.ticker.remove(effectTicker);
		app.stage.removeChild(sprites);
	};

	return {
		stop: () => {
			isDisposed = true;
		},
		destroy,
	};
};

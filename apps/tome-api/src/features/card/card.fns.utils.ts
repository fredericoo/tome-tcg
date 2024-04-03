import { topOf } from '../engine/engine.board';
import { COLORS, CombatValue, DynamicCombatValue, SpellCard } from '../engine/engine.game';
import { TurnHooks } from '../engine/engine.hooks';

export const removeIfUsedInCombat: TurnHooks<true>['afterDamage'] = async function* removeIfUsedInCombat({
	actions,
	game,
	thisCard,
	ownerSide,
}) {
	const isUsedInCombat = game.turn[ownerSide].spellAttack?.card === thisCard;
	if (!isUsedInCombat) return;
	const thisCardStack = COLORS.find(stack => game.board.players[ownerSide].stacks[stack].includes(thisCard));
	if (!thisCardStack) return;
	yield* actions.discard({
		card: thisCard,
		from: game.board.players[ownerSide].stacks[thisCardStack],
	});
};

export const resolveCombatValue = (combatValue: CombatValue, params: Parameters<DynamicCombatValue['getValue']>[0]) =>
	typeof combatValue === 'object' ? combatValue.getValue(params) : combatValue;

/** Orb attack value calculation that takes into consideration "Marble Field" */
export const orbAttackValue: Extract<SpellCard['attack'], object>['getValue'] = ({ game, ownerSide, thisCard }) => {
	const thisStack = COLORS.find(stack => topOf(game.board.players[ownerSide].stacks[stack]) === thisCard);
	if (!thisStack) return 11;

	const isMarbleFieldActive = topOf(game.board.field)?.id === '94';
	const shouldActivate = isMarbleFieldActive || topOf(game.board.players[ownerSide].stacks[thisStack]) === thisCard;
	if (shouldActivate) {
		const cardUnderThis = game.board.players[ownerSide].stacks[thisStack][1];
		if (cardUnderThis?.name.includes('Orb')) return 20;
	}
	return 11;
};

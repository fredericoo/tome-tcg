import { COLORS, CombatValue, DynamicCombatValue } from '../engine/engine.game';
import { TurnHooks, effectVfx } from '../engine/engine.hooks';

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
	yield* effectVfx(thisCard);
	yield* actions.discard(thisCard);
};

export const resolveCombatValue = (combatValue: CombatValue, params: Parameters<DynamicCombatValue['getValue']>[0]) =>
	typeof combatValue === 'object' ? combatValue.getValue(params) : combatValue;

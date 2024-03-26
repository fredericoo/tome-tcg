import { CombatValue, DynamicCombatValue, STACKS } from '../engine/engine.game';
import { TurnHooks } from '../engine/engine.hooks';

export const removeIfUsedInCombat: TurnHooks<true>['afterDamage'] = async function* removeIfUsedInCombat({
	actions,
	game,
	thisCard,
	ownerSide,
	turn,
}) {
	const isUsedInCombat = turn[ownerSide].spellAttack?.card === thisCard;
	if (!isUsedInCombat) return;
	const thisCardStack = STACKS.find(stack => game.board.players[ownerSide].stacks[stack].includes(thisCard));
	if (!thisCardStack) return;
	yield* actions.discard({
		card: thisCard,
		from: game.board.players[ownerSide].stacks[thisCardStack],
		side: ownerSide,
	});
};

export const resolveCombatValue = (combatValue: CombatValue, params: Parameters<DynamicCombatValue['getValue']>[0]) =>
	typeof combatValue === 'object' ? combatValue.getValue(params) : combatValue;

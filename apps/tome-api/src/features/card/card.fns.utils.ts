import { STACKS } from '../engine/engine.game';
import { TurnHooks } from '../engine/engine.hooks';

export const removeIfUsedInCombat: TurnHooks<true>['afterCombat'] = async function* removeIfUsedInCombat({
	actions,
	game,
	thisCard,
	ownerSide,
	turn,
}) {
	const isUsedInCombat = turn.spells?.[ownerSide]?.card === thisCard;
	if (!isUsedInCombat) return;
	const thisCardStack = STACKS.find(stack => game.board.players[ownerSide].stacks[stack].includes(thisCard));
	if (!thisCardStack) return;
	yield* actions.discard({
		card: thisCard,
		from: game.board.players[ownerSide].stacks[thisCardStack],
		side: ownerSide,
	});
};

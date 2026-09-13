import { getCards } from "./storage.js";

export function isDue(card) {
  return new Date(card.due).getTime() <= Date.now();
}

/*
States:
 0 = New
 1 = Learning
 2 = Review
 3 = Relearning

Learning/relearning cards are given priority over review/new cards.
*/

export function isLearningCard(card) {
  return card.state === 1 || card.state === 3;
}

export function isNewCard(card) {
  return card.state === 0;
}

export function getNextDueCardId(currentCardId) {
  const flashcards = getCards();

  const learning = [];
  const reviews = [];
  const newCards = [];

  for (const [id, card] of flashcards) {
    // Do not display a card twice in a row
    if (id === currentCardId) {
      continue;
    }

    if (!isDue(card)) {
      continue;
    }

    const item = {
      id,
      due: new Date(card.due).getTime(),
    };

    if (isLearningCard(card)) {
      learning.push(item);
    } else if (isNewCard(card)) {
      newCards.push(item);
    } else {
      reviews.push(item);
    }
  }

  // (re)learning cards first,
  if (learning.length > 0) {
    learning.sort((a, b) => a.due - b.due);

    return learning[0].id;
  }

  // then ordinary review cards,
  if (reviews.length > 0) {
    reviews.sort((a, b) => a.due - b.due);

    return reviews[0].id;
  }

  // and finally new cards.
  if (newCards.length > 0) {
    newCards.sort((a, b) => a.due - b.due);

    return newCards[0].id;
  }

  // Nothing is due -> session ends
  return null;
}

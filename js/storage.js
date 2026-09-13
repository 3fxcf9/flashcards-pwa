const STORAGE_KEY = "flashcard-fsrs";

import {
  generatorParameters,
  createEmptyCard,
} from "https://esm.sh/ts-fsrs@5.4.2";

function init() {
  const data = {
    date: new Date().toISOString(),
    parameters: structuredClone(generatorParameters()),
    cards: {},
  };
  save(data);
}

function save(data) {
  data.date = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    init();
    return load();
  }

  const parsed = JSON.parse(raw);

  if (!parsed || !parsed.parameters || !parsed.cards) {
    throw new Error(
      "Invalid saved FSRS data, please backup localStorage and clear it.",
    );
  }

  return parsed;
}

export function exportDB() {
  return { exported_ad: new Date().toISOString(), ...load() };
}

/***** Cards *****/

function serializeCard(card) {
  return {
    id: card.id,
    hash: card.hash,
    direction: card.direction,
    subject: card.subject,
    chapter: card.chapter,
    front: card.front,
    back: card.back,
    reversed: card.reversed,

    // Scheduling infos
    due:
      card.due instanceof Date
        ? card.due.toISOString()
        : new Date(card.due).toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: card.learning_steps,
    state: card.state,
    last_review:
      card.last_review == null
        ? null
        : card.last_review instanceof Date
          ? card.last_review.toISOString()
          : new Date(card.last_review).toISOString(),
  };
}

function deserializeCard(saved) {
  return {
    id: saved.id,
    hash: saved.hash,
    direction: saved.direction,
    subject: saved.subject,
    chapter: saved.chapter,
    front: saved.front,
    back: saved.back,
    reversed: saved.reversed,

    // Scheduling infos
    due: new Date(saved.due),
    stability: saved.stability,
    difficulty: saved.difficulty,
    elapsed_days: saved.elapsed_days,
    scheduled_days: saved.scheduled_days,
    reps: saved.reps,
    lapses: saved.lapses,
    learning_steps: saved.learning_steps,
    state: saved.state,
    last_review:
      saved.last_review == null ? undefined : new Date(saved.last_review),
  };
}

export function getCards() {
  const cards = load()?.cards;
  if (cards == null) {
    throw new Error("Failed to load cards.");
  }
  return new Map(
    Object.entries(cards).map(([id, c]) => [id, deserializeCard(c)]),
  );
}
export function setCards(new_cards) {
  const data = load();
  data.cards = Object.fromEntries(new_cards);
  save(data);
}
export function getCardWithId(id) {
  const cards = getCards();
  if (!cards.has(id)) {
    return null;
  }
  return deserializeCard(cards.get(id));
}
export function updateCard(id, new_card) {
  const cards = getCards();

  if (!cards.has(id)) {
    throw new Error("Card not found.");
  }

  cards.set(id, Object.assign(cards.get(id), serializeCard(new_card)));
  setCards(cards);
}

/***** params *****/

export function getParameters() {
  const params = load()?.parameters;
  if (params == null) {
    throw new Error("Failed to load parameters.");
  }
  return params;
}
export function updateParams(new_params) {
  const data = load();
  data.params = Object.assign(data.params, new_params);
  save(data);
}

/***** Synchronization *****/

export function synchronizeCards(loaded_cards) {
  const oldCards = getCards();
  const newCards = new Map();

  // Already existing card is preserved, new cards are initialized and any card that existed before but is not present in loaded_cards is discarded.
  for (const [id, loaded_card] of loaded_cards) {
    if (oldCards.has(id) && oldCards.get(id).state != null) {
      newCards.set(id, Object.assign(oldCards.get(id), loaded_card));
    } else {
      // New card, due now
      newCards.set(
        id,
        Object.assign(serializeCard(createEmptyCard(new Date())), loaded_card),
      );
    }
  }

  setCards(newCards);
}

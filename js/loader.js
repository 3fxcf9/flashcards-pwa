const FLASHCARDS_URL = "https://3fxcf9.github.io/mag1/flashcards.json";

import { md5 } from "./md5.js";

export async function loadFlashcards() {
  const response = await fetch(FLASHCARDS_URL, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Could not fetch ${FLASHCARDS_URL}: ` +
        `${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  const flashcards = new Map();
  const macros = {};

  /*
  {
    "maths": {
      "chapters": {
        "Algebra": {
          "macros": "js script for now",
          "cards": [
            {
              "front": "...",
              "back": "...",
              "reversed": "true"
            }
          ]
        }
      }
    }
  }
 */

  for (const [subject, subjectData] of Object.entries(data)) {
    if (!subjectData || typeof subjectData !== "object") {
      continue;
    }

    const chapters = subjectData.chapters;
    if (!chapters || typeof chapters !== "object") {
      continue;
    }

    macros[subject] = {};

    for (const [chapter, chapterData] of Object.entries(chapters)) {
      if (!chapterData || typeof chapterData !== "object") {
        continue;
      }

      const cards = chapterData.cards;
      if (!Array.isArray(cards)) {
        continue;
      }

      macros[subject][chapter] = chapterData.macros;

      for (const rawCard of cards) {
        if (
          !rawCard ||
          typeof rawCard.front !== "string" ||
          typeof rawCard.back !== "string"
        ) {
          continue;
        }

        const hash = md5(rawCard.front);
        const reversed =
          rawCard.reversed === true || rawCard.reversed === "true";

        // Create the card
        const normalId = `${hash}:normal`;

        flashcards.set(normalId, {
          id: normalId,
          hash,
          direction: "normal",
          subject,
          chapter,
          front: rawCard.front,
          back: rawCard.back,
          reversed,
        });

        // Create a second independent FSRS card for reversed cards
        if (reversed) {
          const reverseId = `${hash}:reverse`;

          flashcards.set(reverseId, {
            id: reverseId,
            hash,
            direction: "reverse",
            subject,
            chapter,
            front: rawCard.back,
            back: rawCard.front,
            reversed: true,
          });
        }
      }
    }
  }

  return [flashcards, macros];
}

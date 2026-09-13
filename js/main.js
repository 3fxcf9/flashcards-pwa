import { fsrs, Rating } from "https://esm.sh/ts-fsrs@5.4.2";
import {
  synchronizeCards,
  getParameters,
  getCards,
  exportDB,
} from "./storage.js";
import { getNextDueCardId, isDue } from "./due.js";
import { loadFlashcards } from "./loader.js";
import { getCardWithId, updateCard } from "./storage.js";

// State

let scheduler = null;
let currentCardId = null;
let reviewCount = 0;
let macros = null;

// DOM

const $ = (id) => document.getElementById(id);
const status = $("status");
const errorBox = $("error");
const home = $("home");
const review = $("review");
const done = $("done");
const summary = $("summary");
const cardFront = $("card-front");
const cardBack = $("card-back");
const revealButton = $("reveal");
const ratings = $("ratings");
const progress = $("progress");
const ratingButtons = [...ratings.querySelectorAll("button")];
const intervalElements = {
  1: $("again-interval"),
  2: $("hard-interval"),
  3: $("good-interval"),
  4: $("easy-interval"),
};

function updateHome() {
  let due = 0;
  let newCards = 0;

  const flashcards = getCards();
  for (const [_, card] of flashcards) {
    if (card.reps === 0) {
      newCards++;
    }
    if (isDue(card)) {
      due++;
    }
  }

  summary.textContent =
    `${flashcards.size} cards · ` + `${newCards} new · ` + `${due} due`;
  const startButton = $("start-button");
  startButton.disabled = due === 0;
  startButton.textContent =
    due === 0 ? "Nothing to review" : `Start review (${due})`;
}

function showOnly(section) {
  home.classList.add("hidden");
  review.classList.add("hidden");
  done.classList.add("hidden");
  section.classList.remove("hidden");
}

function startReview() {
  reviewCount = 0;
  currentCardId = null;
  showOnly(review);
  showNextCard();
}

function showNextCard() {
  const nextId = getNextDueCardId(currentCardId);
  if (!nextId) {
    finishReview();
    return;
  }
  currentCardId = nextId;
  reviewCount++;
  showCurrentCard();
}

function renderMath(local_macros) {
  const macros = {
    "\\leq": "\\leqslant",
    "\\geq": "\\geqslant",
    "\\subsetneq": "\\varsubsetneq",
    "\\supsetneq": "\\varsupsetneq",
    "\\emptyset": "\\varnothing",
    "\\1": "\\mathbf{1}",
    "\\N": "\\mathbf{N}",
    "\\Z": "\\mathbf{Z}",
    "\\Q": "\\mathbf{Q}",
    "\\R": "\\mathbf{R}",
    "\\C": "\\mathbf{C}",
    "\\U": "\\mathbf{U}",
    "\\F": "\\mathbf{F}",
    "\\P": "\\mathbf{P}",
    "\\Prime": "\\mathbf{P}",
    "\\K": "\\mathbf{K}",
    "\\L": "\\mathscr{L}",
    "\\O": "\\mathcal{O}",
    "\\B": "\\mathscr{B}",
    "\\D": "\\mathbf{D}",
    "\\M": "\\mathcal{M}",
    "\\E": "\\mathscr{E}",
    "\\Ball": "\\mathscr{B}",
    "\\Disk": "\\mathscr{D}",
    "\\Vois": "\\mathscr{V}",
    "\\Epi": "\\operatorname{Epi}",
    "\\GL": "\\mathscr{GL}",
    "\\Pass": "\\mathscr{P}_{#1 \\to #2}",
    "\\Sym": "\\mathscr{S}",
    "\\Antisym": "\\mathscr{A}",
    "\\GLM": "\\mathrm{GL}",
    "\\CM": "\\mathscr{CM}",
    "\\Func": "\\mathcal{F}",
    "\\Def": "\\mathscr{D}",
    "\\Cont": "\\mathscr{C}",
    "\\Diff": "\\mathscr{D}",
    "\\Part": "\\mathcal{P}",
    "\\Prop": "\\mathscr{P}",
    "\\bar": "\\overline",
    "\\ubar": "\\underline",
    "\\Re": "\\mathscr{R\\!e}",
    "\\Im": "\\mathscr{I\\!\\!m}",
    "\\ch": "\\operatorname{ch}",
    "\\sh": "\\operatorname{sh}",
    "\\th": "\\operatorname{th}",
    "\\set": "\\{\\,#1\\,\\}",
    "\\cgm": "\\equiv #1 \\left[#2\\right]",
    "\\ncgm": "\\not\\equiv #1 \\left[#2\\right]",
    "\\vv": "\\overrightarrow{#1}",
    "\\div": "\\operatorname{div}",
    "\\abs": "\\left\\lvert#1\\right\\rvert",
    "\\norm": "\\left\\lVert#1\\right\\rVert",
    "\\opnorm": "\\left\\lVert#1\\right\\rVert_{\\text{op}}",
    "\\triplenorm":
      "|\\hspace{-0.1em}|\\hspace{-0.1em}|#1|\\hspace{-0.1em}|\\hspace{-0.1em}|",
    "\\floor": "\\left\\lfloor#1\\right\\rfloor",
    "\\ceil": "\\left\\lceil#1\\right\\rceil",
    "\\card": "\\#",
    "\\prop": "\\mathcal{P}",
    "\\prob": "\\mathbb{P}",
    "\\supp": "\\operatorname{supp}",
    "\\pgcd": "\\operatorname{pgcd}",
    "\\ppcm": "\\operatorname{ppcm}",
    "\\gcd": "\\operatorname{pgcd}",
    "\\lcm": "\\operatorname{ppcm}",
    "\\grp": "\\left\\langle #1 \\right\\rangle",
    "\\eval": "\\left. #1 \\right|_{#2}",
    "\\arc": "\\overset{#1}{\\longleftrightarrow}",
    "\\arrowlim": "\\ \\xrightarrow[\\;#1\\;]{}\\ ",
    "\\sarrowlim": "\\ \\xrightarrow[\\;#1\\;]{\\text{simplement}}\\ ",
    "\\uarrowlim": "\\ \\xrightarrow[\\;#1\\;]{\\text{uniformément}}\\ ",
    "\\ev": "\\underset{#1}\\sim",
    "\\textlim": "\\lim\\limits_{#1}",
    "\\dd": "\\mathrm{d}",
    "\\expect": "\\mathbb{E}",
    "\\variance": "\\mathbb{V}",
    "\\Vect": "\\operatorname{Vect}",
    "\\img": "\\operatorname{img}",
    "\\id": "\\operatorname{id}",
    "\\Aut": "\\operatorname{Aut}",
    "\\adh": "\\operatorname{Adh}",
    "\\rang": "\\operatorname{rang}",
    "\\rg": "\\operatorname{rg}",
    "\\mat": "\\operatorname{mat}",
    "\\tr": "\\operatorname{tr}",
    "\\com": "\\operatorname{com}",
    "\\sinc": "\\operatorname{sinc}",
    "\\mtx": "\\begin{pmatrix}#1\\end{pmatrix}",
    "\\emtx": "\\begin{matrix}#1\\end{matrix}",
    "\\vmtx": "\\begin{vmatrix}#1\\end{vmatrix}",
    "\\arrmtx":
      "\\left(\\def\\arraystretch{1.5}\\begin{array}{#1}#2\\end{array}\\right)",
    "\\arrvmtx":
      "\\left|\\def\\arraystretch{1.5}\\begin{array}{#1}#2\\end{array}\\right|",
    "\\arr": "\\def\\arraystretch{1.5}\\begin{array}{#1}#2\\end{array}",
    "\\transp": "^{\\mkern-1.5mu\\mathsf{T}}",
    "\\can": "\\text{can}",
    "\\tilde": "\\widetilde",
    "\\ang": "\\widehat",
    "\\applic":
      "\\begin{array}{rcl}\\displaystyle#1 & \\longrightarrow & \\displaystyle#2 \\\\ \\displaystyle#3 & \\longmapsto & \\displaystyle#4\\end{array}",
    // "\\scalar": "\\left\\langle #1 \\middle\\vert #2 \\right\\rangle",
    "\\scalar": "\\left\\langle #1 , #2 \\right\\rangle",
    "\\oplusortho": "\\overset{\\perp}{\\oplus}",
    "\\infabs": "\\left\\lVert#1\\right\\rVert_{\\infty, #2}",
    "\\where": "\\;|\\;",
    "\\indep": "\\perp\\mkern{-0.55em}\\perp",
    "\\ps": "\\text{ p.s.}",
    "\\cov": "\\operatorname{Cov}",
    "\\sym": "\\operatorname{\\triangle}",
    "\\ossim": "\\underset{\\text{o.s}}{\\sim}",
    "\\oo": "\\left]#1\\right[",
    "\\oc": "\\left]#1\\right]",
    "\\co": "\\left[#1\\right[",
    "\\cc": "\\left[#1\\right]",
    "\\iset": "\\llbracket #1 \\rrbracket",
    "\\ioo": "\\rrbracket #1 \\llbracket",
    "\\ioc": "\\rrbracket #1 \\rrbracket",
    "\\ico": "\\llbracket #1 \\llbracket",
    "\\icc": "\\llbracket #1 \\rrbracket",
    "\\usim": "\\underset{#1}{\\sim}",
    "\\ueq": "\\underset{#1}{=}",
    "\\oeq": "\\overset{\\text{#1}}{=}",
    "\\upt": "\\underset{#1}{\\propto}",
    "\\opt": "\\overset{\\text{#1}}{\\propto}",
    "\\aussieq": "\\overset{\\text{aussi}}{=}",
    "\\defeq": "\\overset{\\text{def}}{=}",
    "\\defiff": "\\overset{\\text{def}}{\\iff}",
    "\\ugeq": "\\underset{#1}{\\geq}",
    "\\ogeq": "\\overset{\\text{#1}}{\\geq}",
    "\\uleq": "\\underset{#1}{\\leq}",
    "\\oleq": "\\overset{\\text{#1}}{\\leq}",
    "\\uiff": "\\underset{#1}{\\iff}",
    "\\oiff": "\\overset{\\text{#1}}{\\iff}",
    "\\dv": "\\frac{\\dd #1}{\\dd #2}",
    "\\dvN": "\\frac{\\dd^{#3} #1}{\\dd {#2}^{#3}}",
    "\\pdv": "\\frac{\\partial #1}{\\partial #2}",
    "\\pdvN": "\\frac{\\partial^{#3} #1}{\\partial {#2}^{#3}}",
    "\\ortho": "^{\\perp}",
    "\\mdot": "\\boldsymbol{\\cdot}",
    "\\hat": "\\widehat",
    "\\sp": "\\operatorname{Sp}",
    "\\diag": "\\operatorname{diag}",
    "\\long": "\\operatorname{long}",
    "\\sembl": "\\overset{\\tiny S}\\sim",
    "\\mangl": "\\angl{\\scriptsize $#1$\\,}",
    "\\sur": "\\text{ sur }",
    "\\dans": "\\text{ sur }",
    "\\if": "&\\text{si }",
    "\\and": "\\text{ et }",
    "\\ie": "\\text{ i.e. }",
    "\\with": "\\quad\\text{with}\\quad",
    "\\else": "&\\text{sinon}",
    "\\ring": "\\mathring",
    "\\fr": "\\operatorname{fr}",
    "\\longring": "\\mathring{\\overgroup{#1}}",
    "\\non": "\\operatorname{non}",
    "\\stress": "\\color{yellow}#1\\color{reset}",
    // "\\upbigcup": "\\bigcup\\mathclap{\\raisebox{0.2ex}{\\mkern{-3.4ex}$\\uparrow$}}",
    // "\\downbigcup": "\\bigcup\\mathclap{\\raisebox{0.2ex}{\\mkern{-3.4ex}$\\downarrow$}}",
    // "\\upbigcap": "\\bigcap\\mathclap{\\raisebox{-0.2ex}{\\mkern{-3.4ex}$\\uparrow$}}",
    // "\\downbigcap": "\\bigcap\\mathclap{\\raisebox{-0.2ex}{\\mkern{-3.4ex}$\\downarrow$}}"
    "\\upbigcup":
      "\\bigcup\\mathclap{\\raisebox{0.8ex}{\\mkern{-1.22ex}$\\boldsymbol\\uparrow$}}",
    "\\downbigcup":
      "\\bigcup\\mathclap{\\raisebox{0.2ex}{\\mkern{-3.4ex}$\\downarrow$}}",
    "\\upbigcap":
      "\\bigcap\\mathclap{\\raisebox{-0.2ex}{\\mkern{-3.4ex}$\\uparrow$}}",
    "\\downbigcap":
      "\\bigcap\\mathclap{\\raisebox{-0.8ex}{\\mkern{-1.24ex}$\\boldsymbol\\downarrow$}}",
  };
  document
    .querySelectorAll("code.katex-inline, code.katex-display")
    .forEach((element) => {
      let math = element.textContent;
      // Create a new element for rendering
      const renderElement = document.createElement(
        element.classList.contains("katex-display") ? "div" : "span",
      );
      // Replace the code element with the new element
      element.parentNode.replaceChild(renderElement, element);
      try {
        katex.render(math, renderElement, {
          displayMode: element.classList.contains("katex-display"),
          throwOnError: false,
          macros: Object.assign(macros, local_macros),
        });
      } catch (e) {
        console.error("KaTeX rendering error:", e);
      }
    });
}

function showCurrentCard() {
  if (!currentCardId) {
    showNextCard();
    return;
  }

  const card = getCardWithId(currentCardId);

  if (!card) {
    currentCardId = null;
    showNextCard();
    return;
  }

  cardFront.innerHTML = card.front;
  cardBack.innerHTML = card.back;
  cardBack.classList.add("hidden");
  revealButton.classList.remove("hidden");
  ratings.classList.add("hidden");
  progress.textContent = `${reviewCount} card${reviewCount > 1 ? "s" : ""} reviewed so far`;

  // Show FSRS outcomes and their intervals
  const preview = scheduler.repeat(card, new Date());
  for (const rating of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
    const nextCard = preview[rating].card;
    intervalElements[rating].textContent = formatInterval(nextCard.due);
  }

  // FIXME: maybe local macros should be json
  renderMath(
    JSON.parse(
      eval(
        `${macros[card.subject][card.chapter]} JSON.stringify(local_macros)`,
      ),
    ),
  );
}

function formatInterval(date) {
  const now = Date.now();
  const diffMs = new Date(date).getTime() - now;
  const minutes = Math.max(0, Math.round(diffMs / 60000));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = minutes / 60;
  if (hours < 24) {
    return `${Math.round(hours * 10) / 10}h`;
  }

  const days = hours / 24;
  if (days < 30) {
    return `${Math.round(days * 10) / 10}d`;
  }

  const months = days / 30;
  if (months < 12) {
    return `${Math.round(months * 10) / 10}mo`;
  }

  return `${Math.round((days / 365) * 10) / 10}y`;
}

function answer(rating) {
  if (!currentCardId) {
    return;
  }

  const answeredCardId = currentCardId;
  const answeredCard = getCardWithId(answeredCardId);
  if (answeredCard == null) {
    return;
  }

  const result = scheduler.next(answeredCard, new Date(), rating);
  updateCard(answeredCardId, result.card);

  currentCardId = null; // No longer the current card
  showNextCard();
}

function finishReview() {
  currentCardId = null;

  $("done-message").textContent =
    `You reviewed ${reviewCount} card` + (reviewCount > 1 ? "s" : "") + ".";

  showOnly(done);
}

function downloadData() {
  const output = exportDB();
  const blob = new Blob([JSON.stringify(output, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "flashcard-fsrs-data.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/***** Evente *****/

$("start-button").addEventListener("click", startReview);

revealButton.addEventListener("click", () => {
  cardBack.classList.remove("hidden");
  revealButton.classList.add("hidden");
  ratings.classList.remove("hidden");
});

for (const button of ratingButtons) {
  button.addEventListener("click", () => {
    const rating = Number(button.dataset.rating);
    answer(rating);
  });
}

$("done-home").addEventListener("click", () => {
  updateHome();
  showOnly(home);
});

$("download-button").addEventListener("click", downloadData);

$("reload-button").addEventListener("click", () => {
  initialize();
});

/***** Init *****/

async function initialize() {
  try {
    errorBox.classList.add("hidden");
    status.textContent = "Loading cards…";

    // Fetch flashcards
    const [flashcards, m] = await loadFlashcards();
    synchronizeCards(flashcards);
    macros = m;

    scheduler = fsrs(getParameters());
    status.classList.add("hidden");
    updateHome();
    showOnly(home);
  } catch (err) {
    console.error(err);
    status.textContent = "Error while loading cards.";
    errorBox.textContent = err instanceof Error ? err.message : String(err);
    errorBox.classList.remove("hidden");
    showOnly(home);
  }
}

initialize();

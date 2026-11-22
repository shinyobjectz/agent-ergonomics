// Motion on the page: words arrive, sections reveal, the demos play themselves, buttons lean toward the pointer.
// Everything here is decoration. Without it, or with reduced motion, the page shows its final state.
(() => {
  const M = window.Motion;
  const root = document.documentElement;
  if (!M || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.remove("anim");
    return;
  }
  const { animate, inView, stagger, scroll } = M;
  const soft = { type: "spring", stiffness: 70, damping: 18, mass: 1 };
  const settle = { duration: 1.1, ease: [0.22, 1, 0.36, 1] };

  // Split headings into words, keeping inner spans (the softer second sentence) around their own words.
  function split(el) {
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.append(part);
            else { const w = document.createElement("span"); w.className = "word"; w.textContent = part; frag.append(w); }
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    walk(el);
    return el.querySelectorAll(".word");
  }

  // Take over from the CSS fallback: hide what will animate inline, then drop the class.
  const words = [...document.querySelectorAll("[data-words]")].map((h) => [h, split(h)]);
  const hidden = document.querySelectorAll("[data-reveal], .word, .demo [data-step]");
  hidden.forEach((el) => { el.style.opacity = "0"; });
  document.querySelectorAll(".demo .cut").forEach((el) => { el.style.backgroundSize = "0% 1px"; });
  clearTimeout(window.__animFallback);
  root.classList.remove("anim");

  const wordsIn = (list, delay = 0) =>
    animate(list, { opacity: [0, 1], y: ["0.45em", "0em"], filter: ["blur(14px)", "blur(0px)"] },
      { ...settle, duration: 1.4, delay: stagger(0.07, { startDelay: delay }) });

  const reveal = (el, delay = 0) =>
    animate(el, { opacity: [0, 1], y: [28, 0], filter: ["blur(8px)", "blur(0px)"] }, { ...settle, delay });

  // Opening: the statement first, then the bar, the line under it and the install card.
  const [hero, heroWords] = words[0];
  wordsIn(heroWords, 0.25);
  const opening = document.querySelector(".opening");
  opening.querySelectorAll("[data-reveal]").forEach((el, i) => reveal(el, 0.9 + i * 0.18));

  // As the opening scrolls away, the statement lifts and dims.
  scroll(animate(hero, { y: [0, -90], opacity: [1, 0.15] }, { ease: "linear" }),
    { target: opening, offset: ["start start", "end start"] });

  // Everything else reveals as it enters, staggered within its section.
  document.querySelectorAll("main section, main > .skills-intro").forEach((sec) => {
    const items = [...sec.querySelectorAll(":scope [data-reveal]")].filter((el) => !el.closest("[data-place]"));
    inView(sec, () => { items.forEach((el, i) => reveal(el, i * 0.12)); }, { amount: 0.18 });
  });

  // The idea's four lines: the rule draws, then the line and its fix.
  document.querySelectorAll("[data-place]").forEach((li) => {
    const rule = li.querySelector(".rule");
    rule.style.transform = "scaleX(0)";
    inView(li, () => {
      animate(rule, { transform: ["scaleX(0)", "scaleX(1)"] }, { duration: 1.4, ease: [0.65, 0, 0.35, 1] });
      li.querySelectorAll("[data-reveal]").forEach((el, i) => reveal(el, 0.25 + i * 0.15));
    }, { amount: 0.35 });
  });

  // The closing line arrives word by word.
  words.slice(1).forEach(([h, list]) => inView(h, () => { wordsIn(list); }, { amount: 0.5 }));

  // Demos.
  const strike = (el, delay, duration = 0.55) =>
    animate(0, 100, { duration, delay, ease: [0.65, 0, 0.35, 1], onUpdate: (v) => { el.style.backgroundSize = `${v}% 1px`; } });

  const demos = {
    log(card) {
      animate(card.querySelectorAll("[data-step]"), { opacity: [0, 1], x: [-14, 0] },
        { ...settle, delay: stagger(0.22, { startDelay: 0.5 }) });
    },
    cut(card) {
      const cuts = card.querySelectorAll(".cut");
      cuts.forEach((c, i) => strike(c, 0.6 + i * 0.7, 0.8));
      const after = card.querySelector("[data-step]");
      animate(after, { opacity: [0, 1], y: [16, 0], filter: ["blur(10px)", "blur(0px)"] }, { ...settle, delay: 0.7 + cuts.length * 0.7 });
    },
    terms(card) {
      const cuts = [...card.querySelectorAll(".terms .cut")];
      cuts.forEach((c, i) => {
        strike(c, 0.5 + i * 0.16, 0.4);
        animate(c, { opacity: [1, 0.55], scale: [1, 0.96] }, { duration: 0.6, delay: 0.7 + i * 0.16 });
      });
      const kept = card.querySelector(".kept");
      animate(kept, { color: ["#16171c", "#4a3aa8", "#16171c"], scale: [1, 1.08, 1] }, { duration: 1.2, delay: 0.6 + cuts.length * 0.16 });
      animate(card.querySelectorAll("[data-step]"), { opacity: [0, 1], y: [18, 0], scale: [0.92, 1] },
        { ...soft, delay: stagger(0.18, { startDelay: 1.2 + cuts.length * 0.16 }) });
    },
  };
  document.querySelectorAll("[data-demo]").forEach((card) => {
    inView(card, () => { demos[card.dataset.demo](card); }, { amount: 0.55 });
  });

  // Fine pointers only: buttons lean toward the pointer, the install card tilts with it.
  if (!matchMedia("(pointer: fine)").matches) return;

  document.querySelectorAll(".magnet").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.28;
      const y = (e.clientY - r.top - r.height / 2) * 0.4;
      animate(btn, { x, y }, { type: "spring", stiffness: 260, damping: 18 });
    });
    btn.addEventListener("pointerleave", () => animate(btn, { x: 0, y: 0 }, { type: "spring", stiffness: 180, damping: 14 }));
  });

  const card = document.querySelector(".install");
  opening.addEventListener("pointermove", (e) => {
    const rx = (e.clientY / innerHeight - 0.5) * -5;
    const ry = (e.clientX / innerWidth - 0.5) * 7;
    animate(card, { transform: `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg)` }, { type: "spring", stiffness: 60, damping: 16 });
  });
  opening.addEventListener("pointerleave", () =>
    animate(card, { transform: "perspective(1100px) rotateX(0deg) rotateY(0deg)" }, { type: "spring", stiffness: 60, damping: 16 }));
})();

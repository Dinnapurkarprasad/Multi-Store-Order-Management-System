// One orchestrated load sequence: nav drops, the headline masks up line by
// line, the chips stagger in at 60ms (PRD §7).
//
// Deliberately NOT a fade-and-slide-up on every section as you scroll — that
// single pattern is the fastest way to look generated. Shared by Hero and
// OrderChips so their two halves of the sequence stay in step.
export const STAGGER = 0.06;

// Records how the teacher last interacted, as data-input="pointer" | "keyboard"
// on <html>. It feeds the `keyboard:` variant in src/index.css.
//
// Why: browsers hide :focus-visible rings after a mouse click, except on
// <select>. Chrome treats a select as a typing control and keeps its ring after
// a mouse pick, so the header's Subject and Grade pills showed a teal ring until
// you clicked elsewhere. `keyboard:focus-visible:ring-2` shows the ring unless
// the last input was a pointer, so keyboard and screen-reader users keep it
// (it's on by default, before any input) and mouse users don't see it.

let installed = false

export function trackInputModality(): void {
  if (installed || typeof document === "undefined") return
  installed = true
  const root = document.documentElement
  const set = (mode: "pointer" | "keyboard") => {
    if (root.dataset.input !== mode) root.dataset.input = mode
  }
  document.addEventListener("pointerdown", () => set("pointer"), { capture: true, passive: true })
  document.addEventListener(
    "keydown",
    (e) => {
      // A modifier on its own (Cmd to copy, Shift to select) isn't navigation.
      if (e.key === "Meta" || e.key === "Control" || e.key === "Alt" || e.key === "Shift") return
      set("keyboard")
    },
    { capture: true },
  )
}

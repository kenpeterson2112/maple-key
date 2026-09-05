# Todo — deferred work

Items parked deliberately, with enough context to pick up cold. Not a backlog
of everything; things that were in scope for a change and consciously left out.

## Planning questions

- **Voice-to-text on the answer box.** The planning-questions card
  (`src/components/lesson-planner/planning-questions.tsx`) is now open-text
  first, which makes dictation the natural input for a teacher planning
  between periods. Mic button in the top-right of the textarea, tap to
  start/stop, real-time transcription into the same `openResponseValues`
  state the keyboard writes to — so nothing downstream changes.

  Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`). Two things
  to settle before building it:
  - Support is uneven — Firefox has none, and Safari's implementation is
    partial. The mic must be feature-detected and simply absent when
    unavailable, never a dead button.
  - Chrome's implementation streams audio to a Google service. That is a
    teacher dictating about their own students, so it needs a visible notice
    at minimum, and is worth weighing against an on-device alternative.

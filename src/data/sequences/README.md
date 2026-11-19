# Scope and sequence files

A district's (or our own) teaching order for one subject and grade. The top
nav's "next step" follows it; without one, it follows the Ontario curriculum
order (`src/lib/scope-sequence.ts`).

One JSON file per subject and grade:

```json
{
  "name": "Example DSB Grade 6 Math scope and sequence",
  "province": "ON",
  "subject": "Math",
  "grade": "6",
  "codes": ["B1.1", "B1.2", "E1.1", "..."]
}
```

`codes` are specific-expectation codes in teaching order. Any code that isn't
in the curriculum for that subject and grade is ignored, so a sequence can
never reintroduce orphan codes. Codes it leaves out keep their curriculum
order after the listed ones.

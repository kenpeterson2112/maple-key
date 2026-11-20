// Lets `node --test` load the app's extensionless TS imports
// ("../../shared/x") by trying `.ts` when plain resolution fails. The same for
// api/'s "./x.js" imports of TS files (scripts/compare-lesson-models.mjs).
// It also maps the app's "@/" alias to src/ and loads JSON imports (the
// bundled curriculum outline), so tests can reach curriculum-codes.ts.
const SRC = new URL("../src/", import.meta.url)

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) specifier = new URL(specifier.slice(2), SRC).href
  try {
    return await next(specifier, context)
  } catch (err) {
    const relative = specifier.startsWith(".") || specifier.startsWith("file:")
    if (relative && !/\.[cm]?[jt]s(on)?$/.test(specifier)) {
      return next(`${specifier}.ts`, context)
    }
    if (relative && specifier.endsWith(".js")) {
      return next(`${specifier.slice(0, -3)}.ts`, context)
    }
    throw err
  }
}

export async function load(url, context, next) {
  if (url.endsWith(".json")) {
    return next(url, { ...context, importAttributes: { ...context.importAttributes, type: "json" } })
  }
  return next(url, context)
}

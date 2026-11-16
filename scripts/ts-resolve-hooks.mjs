// Lets `node --test` load the app's extensionless TS imports
// ("../../shared/x") by trying `.ts` when plain resolution fails. The same for
// api/'s "./x.js" imports of TS files (scripts/compare-lesson-models.mjs).
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context)
  } catch (err) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) {
      return next(`${specifier}.ts`, context)
    }
    if (specifier.startsWith(".") && specifier.endsWith(".js")) {
      return next(`${specifier.slice(0, -3)}.ts`, context)
    }
    throw err
  }
}

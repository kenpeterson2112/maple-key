// Lets `node --test` load the app's extensionless TS imports
// ("../../shared/x") by trying `.ts` when plain resolution fails.
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context)
  } catch (err) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) {
      return next(`${specifier}.ts`, context)
    }
    throw err
  }
}

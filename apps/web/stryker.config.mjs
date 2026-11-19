// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: "pnpm",
  // The installed `typescript` is 7.x (the new Go-ported compiler); Stryker core's bundled tsconfig-rewriting
  // preprocessor still calls `ts.parseConfigFileTextToJson`, removed in that version, and crashes before any
  // mutant runs. `inPlace` skips the sandbox-copy step (and that preprocessor) entirely -- safe here since
  // everything is committed and Stryker restores the originals after each mutant regardless.
  inPlace: true,
  testRunner: "command",
  commandRunner: {
    command:
      "pnpm exec tsx --test src/features/jobs/scraper-contract.test.ts src/features/jobs/scrapers/linkedin.test.ts",
  },
  // No per-test coverage analysis: Node's built-in test runner (tsx --test) has no Stryker plugin, so the
  // generic command runner reruns the whole test file per mutant.
  coverageAnalysis: "off",
  mutate: ["src/features/jobs/scraper-contract.ts", "src/features/jobs/scrapers/linkedin.ts"],
  reporters: ["html", "clear-text", "progress"],
  htmlReporter: {
    fileName: "reports/mutation/index.html",
  },
  tempDirName: ".stryker-tmp",
  timeoutMS: 30000,
};

export default config;

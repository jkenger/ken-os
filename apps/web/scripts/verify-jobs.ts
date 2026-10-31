import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { jobCurrencyRates, jobMatches, users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Database check for Jobs receiving and listing (docs/product/job-finder.md, release step 1). A throwaway user is
// created and deleted, cascading everything it made.
async function main() {
  const store = await import("../src/features/jobs/store");
  const currencyRatesStore = await import("../src/features/jobs/currency-rates-store");
  const userId = `jobs-check-${randomUUID()}`;
  await db()
    .insert(users)
    .values({ id: userId, email: `${userId}@example.invalid`, name: "Jobs Check" });

  try {
    await store.savePostings(userId, [
      {
        source: "linkedin",
        sourceId: "li-1",
        title: "Senior Frontend Engineer",
        company: "Acme Inc",
        location: "Remote, United States",
        snippet: "Join our team.",
        link: "https://www.linkedin.com/jobs/view/1",
      },
    ]);
    let postings = await store.listPostings(userId, "new");
    assert.equal(postings.length, 1);
    assert.equal(postings[0].title, "Senior Frontend Engineer");
    assert.deepEqual(postings[0].sources, [{ source: "linkedin", link: "https://www.linkedin.com/jobs/view/1" }]);
    console.log("ok - a new posting is saved and listed under New");

    await store.savePostings(userId, [
      {
        source: "linkedin",
        sourceId: "li-1",
        title: "Senior Frontend Engineer",
        company: "Acme Inc",
        location: "Remote, United States",
        snippet: "Join our team.",
        link: "https://www.linkedin.com/jobs/view/1",
      },
    ]);
    postings = await store.listPostings(userId, "new");
    assert.equal(postings.length, 1, "the same source ID twice does not duplicate");
    console.log("ok - the same posting from the same source arriving twice is not duplicated");

    await store.savePostings(userId, [
      {
        source: "indeed",
        sourceId: "in-9",
        title: "Senior Frontend Engineer",
        company: "Acme Inc",
        location: "Remote, United States",
        snippet: "Different snippet text from Indeed.",
        link: "https://www.indeed.com/viewjob?jk=9",
      },
    ]);
    postings = await store.listPostings(userId, "new");
    assert.equal(postings.length, 1, "matching title, company and location merges into one posting");
    assert.deepEqual(
      postings[0].sources.map((source) => source.source).sort(),
      ["indeed", "linkedin"],
      "the merged posting lists every source it came from",
    );
    console.log("ok - the same posting from a second source merges instead of duplicating, listing both sources");

    const preferences = await import("../src/features/jobs/preferences-store");
    const DEFAULT_SLICE2_PREFS: Omit<
      import("../src/features/jobs/preferences-store").JobPreferences,
      "skipWords" | "skipCompanies" | "postedWithinDays"
    > = {
      minimumPay: null,
      payCurrency: "USD",
      payPeriod: "month",
      jobTypes: ["full_time", "contract"],
      workSetups: ["remote"],
      agenciesHide: false,
    };

    const defaults = await preferences.getPreferences(userId);
    assert.deepEqual(defaults, { skipWords: [], skipCompanies: [], postedWithinDays: 14, ...DEFAULT_SLICE2_PREFS });
    console.log("ok - preferences default to no skip words, no skip companies, 14 days");

    await preferences.savePreferences(userId, {
      skipWords: ["Sales", "Marketing"],
      skipCompanies: ["Acme"],
      postedWithinDays: 7,
      ...DEFAULT_SLICE2_PREFS,
    });
    const saved = await preferences.getPreferences(userId);
    assert.deepEqual(saved, {
      skipWords: ["Sales", "Marketing"],
      skipCompanies: ["Acme"],
      postedWithinDays: 7,
      ...DEFAULT_SLICE2_PREFS,
    });
    console.log("ok - saved preferences persist and reload correctly");

    await preferences.savePreferences(userId, {
      skipWords: ["Only this"],
      skipCompanies: [],
      postedWithinDays: 30,
      ...DEFAULT_SLICE2_PREFS,
    });
    const resaved = await preferences.getPreferences(userId);
    assert.deepEqual(resaved, {
      skipWords: ["Only this"],
      skipCompanies: [],
      postedWithinDays: 30,
      ...DEFAULT_SLICE2_PREFS,
    });
    console.log("ok - saving again replaces the previous preferences, not merges with them");

    await store.savePostings(userId, [
      {
        source: "linkedin",
        sourceId: "li-skip-word",
        title: "Only this Role",
        company: "FilterCo",
        location: "Remote",
        snippet: "Matches the skip word.",
        link: "https://www.linkedin.com/jobs/view/2",
      },
    ]);
    const newAfterSkipWord = await store.listPostings(userId, "new");
    assert.ok(
      !newAfterSkipWord.some((posting) => posting.title === "Only this Role"),
      "a posting matching a skip word does not land under New",
    );
    const filteredOut = await store.listPostings(userId, "filtered_out");
    const skipWordPosting = filteredOut.find((posting) => posting.title === "Only this Role");
    assert.ok(skipWordPosting);
    assert.equal(skipWordPosting.filterReason, "Skip word: Only this");
    console.log("ok - a posting whose title matches a skip word is filtered out, with the matched word as the reason");

    await store.showAnyway(userId, skipWordPosting.id);
    const afterShowAnyway = await store.listPostings(userId, "new");
    const movedBack = afterShowAnyway.find((posting) => posting.title === "Only this Role");
    assert.ok(movedBack);
    assert.equal(movedBack.filterReason, null);
    console.log("ok - Show anyway moves a filtered posting back to New and clears its reason");

    await preferences.savePreferences(userId, {
      skipWords: [],
      skipCompanies: [],
      postedWithinDays: 0,
      ...DEFAULT_SLICE2_PREFS,
    });
    await store.refilterExisting(userId);
    const afterRefilter = await store.listPostings(userId, "filtered_out");
    assert.ok(
      afterRefilter.some(
        (posting) => posting.title === "Only this Role" && posting.filterReason === "Posted over 0 days ago",
      ),
    );
    console.log(
      "ok - saving a stricter posted-within-days setting refilters postings already saved, not just new ones",
    );

    const scraperState = await import("../src/features/jobs/scraper-state");
    const notYetChecked = await scraperState.getScraperState(userId, "linkedin");
    assert.equal(notYetChecked, null);
    assert.equal(await scraperState.isBlocked(userId, "linkedin"), false);
    console.log("ok - a source with no recorded run is not blocked");

    await scraperState.recordRun(userId, "linkedin", "ok");
    const afterRun = await scraperState.getScraperState(userId, "linkedin");
    assert.equal(afterRun?.lastResult, "ok");
    assert.equal(afterRun?.blockedUntil, null);
    assert.equal(await scraperState.isBlocked(userId, "linkedin"), false);
    console.log("ok - a successful run records its result and leaves the source unblocked");

    await scraperState.recordBlocked(userId, "linkedin");
    const afterBlock = await scraperState.getScraperState(userId, "linkedin");
    assert.equal(afterBlock?.lastResult, "blocked");
    assert.ok(afterBlock?.blockedUntil && afterBlock.blockedUntil.getTime() > Date.now());
    assert.equal(await scraperState.isBlocked(userId, "linkedin"), true);
    console.log("ok - a block sets blockedUntil about 24 hours out and reports the source as blocked");

    await scraperState.recordRun(userId, "linkedin", "empty");
    assert.equal(await scraperState.isBlocked(userId, "linkedin"), false);
    console.log("ok - a later successful run clears the block");

    assert.equal(await scraperState.getScraperState(userId, "indeed"), null);
    assert.equal(await scraperState.isBlocked(userId, "indeed"), false);
    await scraperState.recordRun(userId, "indeed", "ok");
    assert.equal((await scraperState.getScraperState(userId, "indeed"))?.lastResult, "ok");
    await scraperState.recordBlocked(userId, "indeed");
    assert.equal(await scraperState.isBlocked(userId, "indeed"), true);
    assert.equal(await scraperState.isBlocked(userId, "linkedin"), false, "blocking one source doesn't block another");
    console.log("ok - Indeed's block state is tracked independently of LinkedIn's");

    await store.savePostings(userId, [
      {
        source: "linkedin",
        sourceId: "li-cross-source",
        title: "Platform Engineer",
        company: "CrossCo",
        location: "Remote",
        snippet: "",
        link: "https://www.linkedin.com/jobs/view/3",
      },
    ]);
    await store.savePostings(userId, [
      {
        source: "indeed",
        sourceId: "in-cross-source",
        title: "Platform Engineer",
        company: "CrossCo",
        location: "Remote",
        snippet: "",
        link: "https://www.indeed.com/viewjob?jk=cross",
      },
    ]);
    const crossSourcePostings = await store.listPostings(userId, "new");
    const crossSource = crossSourcePostings.filter((posting) => posting.title === "Platform Engineer");
    assert.equal(crossSource.length, 1, "a LinkedIn posting and a matching Indeed posting merge into one row");
    assert.deepEqual(
      crossSource[0]!.sources.map((source) => source.source).sort(),
      ["indeed", "linkedin"],
      "the merged posting lists both sources",
    );
    console.log("ok - a posting found by both the LinkedIn and Indeed scrapers merges into one row listing both");

    await store.savePostings(userId, [
      {
        source: "linkedin",
        sourceId: "li-pending-1",
        title: "Pending Role One",
        company: "PendCo",
        location: "Remote",
        snippet: "First snippet.",
        link: "https://www.linkedin.com/jobs/view/10",
      },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 10));
    await store.savePostings(userId, [
      {
        source: "indeed",
        sourceId: "in-pending-2",
        title: "Pending Role Two",
        company: "PendCo",
        location: "Remote",
        snippet: "Second snippet.",
        link: "https://www.indeed.com/viewjob?jk=pending2",
      },
    ]);
    const pending = await store.getPendingPostings(userId, 10);
    const pendingTitles = pending.map((p) => p.title);
    assert.ok(pendingTitles.indexOf("Pending Role One") < pendingTitles.indexOf("Pending Role Two"), "oldest first");
    const pendingOne = pending.find((p) => p.title === "Pending Role One")!;
    assert.deepEqual(pendingOne.sources, [{ source: "linkedin", link: "https://www.linkedin.com/jobs/view/10" }]);
    console.log("ok - getPendingPostings returns unprocessed postings oldest first, with their sources");

    const limited = await store.getPendingPostings(userId, 1);
    assert.equal(limited.length, 1);
    console.log("ok - getPendingPostings respects its limit");

    await store.saveExtractedFields(pendingOne.id, {
      fullDescription: "The full description.",
      partial: false,
      summary: "A short summary.",
      payAmount: 120000,
      payCurrency: "USD",
      payPeriod: "year",
      jobType: "full_time",
      workSetup: "remote",
      eligibilityStated: true,
      countries: ["PH"],
      requiredHours: null,
      seniority: "senior",
      yearsRequired: 5,
      isAgency: false,
      extractPromptVersion: "jobs-extract-v1",
      extractModel: "test-model",
    });
    const afterExtract = await store.getPendingPostings(userId, 10);
    assert.ok(!afterExtract.some((p) => p.id === pendingOne.id), "a processed posting no longer shows as pending");
    console.log("ok - saveExtractedFields marks a posting processed, removing it from the pending list");

    await preferences.savePreferences(userId, {
      skipWords: [],
      skipCompanies: [],
      postedWithinDays: 365,
      minimumPay: 80000,
      payCurrency: "USD",
      payPeriod: "year",
      jobTypes: ["full_time", "contract"],
      workSetups: ["remote"],
      agenciesHide: true,
    });
    await store.savePostings(userId, [
      {
        source: "linkedin",
        sourceId: "li-below-pay",
        title: "Below Min Pay Role",
        company: "SliceTwoCo",
        location: "Remote",
        snippet: "",
        link: "https://www.linkedin.com/jobs/view/20",
      },
      {
        source: "linkedin",
        sourceId: "li-agency",
        title: "Agency Role",
        company: "SliceTwoCo",
        location: "Remote",
        snippet: "",
        link: "https://www.linkedin.com/jobs/view/21",
      },
      {
        source: "linkedin",
        sourceId: "li-good",
        title: "Good Role",
        company: "SliceTwoCo",
        location: "Remote",
        snippet: "",
        link: "https://www.linkedin.com/jobs/view/22",
      },
      {
        source: "linkedin",
        sourceId: "li-part-time",
        title: "Part Time Role",
        company: "SliceTwoCo",
        location: "Remote",
        snippet: "",
        link: "https://www.linkedin.com/jobs/view/23",
      },
      {
        source: "linkedin",
        sourceId: "li-wrong-country",
        title: "Wrong Country Role",
        company: "SliceTwoCo",
        location: "Remote",
        snippet: "",
        link: "https://www.linkedin.com/jobs/view/24",
      },
      {
        source: "linkedin",
        sourceId: "li-unstated-country",
        title: "Unstated Country Role",
        company: "SliceTwoCo",
        location: "Remote",
        snippet: "",
        link: "https://www.linkedin.com/jobs/view/25",
      },
      {
        source: "linkedin",
        sourceId: "li-worldwide",
        title: "Worldwide Role",
        company: "SliceTwoCo",
        location: "Remote",
        snippet: "",
        link: "https://www.linkedin.com/jobs/view/26",
      },
    ]);
    const sliceTwoPending = await store.getPendingPostings(userId, 20);
    const byTitle = (title: string) => sliceTwoPending.find((p) => p.title === title)!;

    const extractDefaults = {
      fullDescription: "Full description.",
      partial: false,
      summary: "Summary.",
      eligibilityStated: true,
      requiredHours: null,
      seniority: "senior" as const,
      yearsRequired: 5,
      extractPromptVersion: "jobs-extract-v2",
      extractModel: "test-model",
    };
    await store.saveExtractedFields(byTitle("Below Min Pay Role").id, {
      ...extractDefaults,
      payAmount: 50000,
      payCurrency: "USD",
      payPeriod: "year",
      jobType: "full_time",
      workSetup: "remote",
      countries: ["PH"],
      isAgency: false,
    });
    await store.saveExtractedFields(byTitle("Agency Role").id, {
      ...extractDefaults,
      payAmount: 90000,
      payCurrency: "USD",
      payPeriod: "year",
      jobType: "full_time",
      workSetup: "remote",
      countries: ["PH"],
      isAgency: true,
    });
    await store.saveExtractedFields(byTitle("Good Role").id, {
      ...extractDefaults,
      payAmount: 90000,
      payCurrency: "USD",
      payPeriod: "year",
      jobType: "full_time",
      workSetup: "remote",
      countries: ["PH"],
      isAgency: false,
    });
    await store.saveExtractedFields(byTitle("Part Time Role").id, {
      ...extractDefaults,
      payAmount: 90000,
      payCurrency: "USD",
      payPeriod: "year",
      jobType: "part_time",
      workSetup: "remote",
      countries: ["PH"],
      isAgency: false,
    });
    await store.saveExtractedFields(byTitle("Wrong Country Role").id, {
      ...extractDefaults,
      payAmount: 90000,
      payCurrency: "USD",
      payPeriod: "year",
      jobType: "full_time",
      workSetup: "remote",
      countries: ["DE"],
      isAgency: false,
    });
    await store.saveExtractedFields(byTitle("Unstated Country Role").id, {
      ...extractDefaults,
      eligibilityStated: false,
      payAmount: 90000,
      payCurrency: "USD",
      payPeriod: "year",
      jobType: "full_time",
      workSetup: "remote",
      countries: [],
      isAgency: false,
    });
    await store.saveExtractedFields(byTitle("Worldwide Role").id, {
      ...extractDefaults,
      eligibilityStated: true,
      payAmount: 90000,
      payCurrency: "USD",
      payPeriod: "year",
      jobType: "full_time",
      workSetup: "remote",
      countries: [],
      isAgency: false,
    });

    const sliceTwoFilteredOut = await store.listPostings(userId, "filtered_out");
    const sliceTwoNew = await store.listPostings(userId, "new");
    const reasonFor = (title: string) =>
      sliceTwoFilteredOut.find((p) => p.title === title)?.filterReason ??
      (sliceTwoNew.some((p) => p.title === title) ? null : undefined);

    assert.equal(reasonFor("Below Min Pay Role"), "Below minimum pay");
    assert.equal(reasonFor("Agency Role"), "Recruiting agency");
    assert.equal(reasonFor("Good Role"), null);
    assert.equal(reasonFor("Part Time Role"), "Job type: part_time");
    assert.equal(
      reasonFor("Unstated Country Role"),
      "Country: not stated",
      "a processed posting that states no eligibility is filtered by default, not shown",
    );
    assert.equal(reasonFor("Wrong Country Role"), "Country: DE");
    assert.equal(
      reasonFor("Worldwide Role"),
      null,
      "a posting that explicitly says it's open to everyone (stated, empty countries) is never filtered for country",
    );
    console.log(
      "ok - saveExtractedFields applies the upgraded filters (minimum pay, job type, countries, agencies) once a posting is processed",
    );

    await preferences.savePreferences(userId, {
      skipWords: [],
      skipCompanies: [],
      postedWithinDays: 365,
      minimumPay: 80000,
      payCurrency: "USD",
      payPeriod: "year",
      jobTypes: ["full_time", "contract"],
      workSetups: ["on_site"],
      agenciesHide: true,
    });
    await store.refilterExisting(userId);
    const afterWorkSetupChange = await store.listPostings(userId, "filtered_out");
    const goodRoleAfter = afterWorkSetupChange.find((p) => p.title === "Good Role");
    assert.ok(goodRoleAfter);
    assert.equal(goodRoleAfter.filterReason, "Work setup: remote");
    console.log(
      "ok - tightening Work setup and refiltering moves an already-processed posting to Filtered out for the new reason",
    );

    // This is a global singleton row, not scoped to the throwaway user -- it may already hold a real cached
    // snapshot from an earlier live run. Captured here and restored afterward, so this script never leaves a
    // fake placeholder behind that would make a later real fetch look falsely fresh for up to a day.
    const [originalRatesRow] = await db().select().from(jobCurrencyRates).where(eq(jobCurrencyRates.id, "global"));

    const rateCheckNow = new Date();
    await currencyRatesStore.saveCachedRates({ USD: 1, PHP: 56.5 }, rateCheckNow);
    assert.equal(await currencyRatesStore.ratesAreStale(rateCheckNow), false, "freshly saved rates are not stale");
    assert.deepEqual(await currencyRatesStore.getCachedRates(), { USD: 1, PHP: 56.5 });
    const muchLater = new Date(rateCheckNow.getTime() + 25 * 60 * 60 * 1000);
    assert.equal(await currencyRatesStore.ratesAreStale(muchLater), true, "rates older than a day are stale again");
    console.log("ok - cached currency rates track freshness and round-trip correctly");

    await preferences.savePreferences(userId, {
      skipWords: [],
      skipCompanies: [],
      postedWithinDays: 365,
      minimumPay: 80000,
      payCurrency: "USD",
      payPeriod: "year",
      jobTypes: ["full_time", "contract"],
      workSetups: ["remote"],
      agenciesHide: false,
    });
    await store.savePostings(userId, [
      {
        source: "linkedin",
        sourceId: "li-currency-below",
        title: "Currency Below Role",
        company: "CurrencyCo",
        location: "Remote",
        snippet: "",
        link: "https://www.linkedin.com/jobs/view/50",
      },
      {
        source: "linkedin",
        sourceId: "li-currency-above",
        title: "Currency Above Role",
        company: "CurrencyCo",
        location: "Remote",
        snippet: "",
        link: "https://www.linkedin.com/jobs/view/51",
      },
      {
        source: "linkedin",
        sourceId: "li-target-country",
        title: "PH Eligible Role",
        company: "CurrencyCo",
        location: "Remote",
        snippet: "",
        link: "https://www.linkedin.com/jobs/view/52",
      },
    ]);
    const currencyPending = await store.getPendingPostings(userId, 10);
    const currencyByTitle = (title: string) => currencyPending.find((p) => p.title === title)!;

    // 1,000,000 PHP/year / 56.5 ~= 17,699 USD/year, below the 80,000 USD/year minimum
    await store.saveExtractedFields(currencyByTitle("Currency Below Role").id, {
      ...extractDefaults,
      payAmount: 1_000_000,
      payCurrency: "PHP",
      payPeriod: "year",
      jobType: "full_time",
      workSetup: "remote",
      countries: ["PH"],
      isAgency: false,
    });
    // 6,000,000 PHP/year / 56.5 ~= 106,195 USD/year, above the 80,000 USD/year minimum
    await store.saveExtractedFields(currencyByTitle("Currency Above Role").id, {
      ...extractDefaults,
      payAmount: 6_000_000,
      payCurrency: "PHP",
      payPeriod: "year",
      jobType: "full_time",
      workSetup: "remote",
      countries: ["PH"],
      isAgency: false,
    });
    await store.saveExtractedFields(currencyByTitle("PH Eligible Role").id, {
      ...extractDefaults,
      payAmount: 90000,
      payCurrency: "USD",
      payPeriod: "year",
      jobType: "full_time",
      workSetup: "remote",
      countries: ["PH"],
      isAgency: false,
    });

    const currencyFilteredOut = await store.listPostings(userId, "filtered_out");
    const currencyNew = await store.listPostings(userId, "new");
    const belowRole = currencyFilteredOut.find((p) => p.title === "Currency Below Role");
    assert.ok(belowRole, "a PHP posting below the converted USD minimum is filtered");
    assert.equal(belowRole?.filterReason, "Below minimum pay");
    assert.ok(
      currencyNew.some((p) => p.title === "Currency Above Role"),
      "a PHP posting above the converted USD minimum is not filtered",
    );
    assert.ok(
      currencyNew.some((p) => p.title === "PH Eligible Role"),
      "a posting explicitly open to PH applicants matches the default target country",
    );
    console.log(
      "ok - a posting's own stated pay converts through the cached rates regardless of its currency, and the default target country is PH",
    );

    if (originalRatesRow) {
      await currencyRatesStore.saveCachedRates(originalRatesRow.rates, originalRatesRow.fetchedAt);
      console.log("ok - the real cached currency rates are restored after the test overwrote them");
    }

    await preferences.savePreferences(userId, {
      skipWords: [],
      skipCompanies: [],
      postedWithinDays: 365,
      minimumPay: 80000,
      payCurrency: "USD",
      payPeriod: "year",
      jobTypes: ["full_time", "contract"],
      workSetups: ["on_site"],
      agenciesHide: true,
    });

    await store.savePostings(userId, [
      {
        source: "linkedin",
        sourceId: "li-scorable",
        title: "Scorable Role",
        company: "SliceThreeCo",
        location: "Remote",
        snippet: "",
        link: "https://www.linkedin.com/jobs/view/30",
      },
      {
        source: "linkedin",
        sourceId: "li-scorable-filtered",
        title: "Filtered Scorable Role",
        company: "SliceThreeCo",
        location: "Remote",
        snippet: "",
        link: "https://www.linkedin.com/jobs/view/31",
      },
    ]);
    const sliceThreePending = await store.getPendingPostings(userId, 10);
    const sliceThreeByTitle = (title: string) => sliceThreePending.find((p) => p.title === title)!;

    await store.saveExtractedFields(sliceThreeByTitle("Scorable Role").id, {
      ...extractDefaults,
      payAmount: 90000,
      payCurrency: "USD",
      payPeriod: "year",
      jobType: "full_time",
      workSetup: "on_site",
      countries: ["PH"],
      isAgency: false,
    });
    await store.saveExtractedFields(sliceThreeByTitle("Filtered Scorable Role").id, {
      ...extractDefaults,
      payAmount: 90000,
      payCurrency: "USD",
      payPeriod: "year",
      jobType: "full_time",
      workSetup: "remote",
      countries: ["PH"],
      isAgency: false,
    });

    const scorableNew = await store.listPostings(userId, "new");
    const scorableFilteredOut = await store.listPostings(userId, "filtered_out");
    const scorableId = scorableNew.find((p) => p.title === "Scorable Role")!.id;
    assert.ok(scorableFilteredOut.some((p) => p.title === "Filtered Scorable Role"));
    console.log("ok - a posting that fails the upgraded filters is saved as Filtered out, not left for scoring");

    const needingScoreNoProfile = await store.getNeedingScore(userId, null, 10);
    assert.ok(
      needingScoreNoProfile.some((p) => p.id === scorableId),
      "an unscored, passing posting needs a score",
    );
    assert.ok(
      !needingScoreNoProfile.some((p) => p.title === "Filtered Scorable Role"),
      "a filtered-out posting is never offered for scoring",
    );
    console.log("ok - getNeedingScore returns a passing, unscored posting and excludes a filtered-out one");

    await store.saveScore(scorableId, {
      score: 77,
      whyFits: [{ reason: "Matches backend experience", citation: "5+ years backend required" }],
      whatsMissing: ["No mention of Kubernetes"],
      scorePromptVersion: "jobs-score-v1",
      profileVersionScored: null,
    });
    const [scoredRow] = await db().select().from(jobMatches).where(eq(jobMatches.postingId, scorableId)).limit(1);
    assert.equal(scoredRow?.score, 77);
    assert.deepEqual(scoredRow?.scoreReasons, {
      whyFits: [{ reason: "Matches backend experience", citation: "5+ years backend required" }],
      whatsMissing: ["No mention of Kubernetes"],
    });
    assert.equal(scoredRow?.scorePromptVersion, "jobs-score-v1");
    assert.equal(scoredRow?.profileVersionScored, null);
    console.log("ok - saveScore stores the score, reasons, prompt version and Profile-version stamp");

    const needingScoreAfterScoring = await store.getNeedingScore(userId, null, 10);
    assert.ok(
      !needingScoreAfterScoring.some((p) => p.id === scorableId),
      "a posting already scored against the current Profile version doesn't need scoring again",
    );
    console.log("ok - a freshly-scored posting is not offered for scoring again against the same Profile version");

    const newProfileVersion = new Date("2026-11-01T00:00:00Z");
    const needingScoreAfterProfileChange = await store.getNeedingScore(userId, newProfileVersion, 10);
    assert.ok(
      needingScoreAfterProfileChange.some((p) => p.id === scorableId),
      "a Profile version change makes an already-scored posting need scoring again",
    );
    console.log("ok - a changed Profile version makes an already-scored posting stale and due for rescoring");

    await store.saveScore(scorableId, {
      score: 85,
      whyFits: [{ reason: "Matches backend experience", citation: "5+ years backend required" }],
      whatsMissing: [],
      scorePromptVersion: "jobs-score-v1",
      profileVersionScored: newProfileVersion,
    });
    const needingScoreAfterRescore = await store.getNeedingScore(userId, newProfileVersion, 10);
    assert.ok(
      !needingScoreAfterRescore.some((p) => p.id === scorableId),
      "rescoring against the new Profile version updates the stamp, so it's no longer stale",
    );
    console.log("ok - rescoring against the new Profile version updates the stamp and clears the staleness");
  } finally {
    await db().delete(users).where(eq(users.id, userId));
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

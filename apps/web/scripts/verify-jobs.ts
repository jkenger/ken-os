import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db/db";
import { jobCurrencyRates, jobMatches, jobPostings, users } from "../src/lib/db/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Database check for Jobs receiving and listing (docs/product/job-finder.md, release step 1). A throwaway user is
// created and deleted, cascading everything it made.
async function main() {
  const store = await import("../src/features/jobs/store");
  const currencyRatesStore = await import("../src/features/jobs/currency-rates-store");
  const checkStatusStore = await import("../src/features/jobs/check-status-store");
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
      "roles" | "skipWords" | "skipCompanies" | "countries" | "shifts" | "postedWithinDays" | "seniority"
    > = {
      minimumPay: null,
      maximumPay: null,
      payCurrency: "USD",
      payPeriod: "month",
      jobTypes: ["full_time", "contract"],
      workSetups: ["remote"],
      agenciesHide: false,
    };

    const defaults = await preferences.getPreferences(userId);
    assert.deepEqual(defaults, {
      roles: [],
      seniority: ["junior", "mid", "senior", "lead"],
      skipWords: [],
      skipCompanies: [],
      countries: [],
      shifts: ["day", "mid"],
      postedWithinDays: 14,
      ...DEFAULT_SLICE2_PREFS,
    });
    console.log("ok - preferences default to no skip words, no skip companies, 14 days");

    await preferences.savePreferences(userId, {
      roles: ["Senior Frontend Engineer", "Full-Stack Developer"],
      seniority: ["junior", "mid", "senior", "lead"],
      skipWords: ["Sales", "Marketing"],
      skipCompanies: ["Acme"],
      countries: [],
      shifts: ["day", "mid"],
      postedWithinDays: 7,
      ...DEFAULT_SLICE2_PREFS,
    });
    const saved = await preferences.getPreferences(userId);
    assert.deepEqual(saved, {
      roles: ["Senior Frontend Engineer", "Full-Stack Developer"],
      seniority: ["junior", "mid", "senior", "lead"],
      skipWords: ["Sales", "Marketing"],
      skipCompanies: ["Acme"],
      countries: [],
      shifts: ["day", "mid"],
      postedWithinDays: 7,
      ...DEFAULT_SLICE2_PREFS,
    });
    console.log("ok - saved preferences persist and reload correctly, including the owner's edited roles");

    await preferences.savePreferences(userId, {
      roles: [],
      seniority: ["junior", "mid", "senior", "lead"],
      skipWords: ["Only this"],
      skipCompanies: [],
      countries: [],
      shifts: ["day", "mid"],
      postedWithinDays: 30,
      ...DEFAULT_SLICE2_PREFS,
    });
    const resaved = await preferences.getPreferences(userId);
    assert.deepEqual(resaved, {
      roles: [],
      seniority: ["junior", "mid", "senior", "lead"],
      skipWords: ["Only this"],
      skipCompanies: [],
      countries: [],
      shifts: ["day", "mid"],
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
      roles: [],
      seniority: ["junior", "mid", "senior", "lead"],
      skipWords: [],
      skipCompanies: [],
      countries: [],
      shifts: ["day", "mid"],
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
    assert.equal(pendingOne.snippet, "First snippet.");
    console.log("ok - getPendingPostings returns unprocessed postings oldest first");

    await store.savePostings(userId, [
      {
        source: "freehire",
        sourceId: "fh-structured-role",
        title: "Structured Fields Role",
        company: "FreehireCo",
        location: "Remote",
        snippet: "A freehire posting with structured fields.",
        link: "https://freehire.me/jobs/structured-role",
        sourceCountries: ["ph", "us"],
        sourceWorkMode: "remote",
        sourceEmploymentType: "contract",
        sourceSalaryMin: 84000,
        sourceSalaryMax: 95000,
        sourceSalaryCurrency: "USD",
        sourceSalaryPeriod: "year",
        sourceExperienceYearsMin: 3,
        skills: ["typescript", "react", "postgresql"],
        postedAt: "2026-10-30T09:00:00Z",
        updatedAt: "2026-10-31T14:47:09Z",
      },
    ]);
    const pendingWithStructuredFields = await store.getPendingPostings(userId, 20);
    const structuredRole = pendingWithStructuredFields.find((p) => p.title === "Structured Fields Role")!;
    assert.deepEqual(structuredRole.sourceCountries, ["ph", "us"]);
    assert.equal(structuredRole.sourceWorkMode, "remote");
    assert.equal(structuredRole.sourceSalaryMin, 84000);
    assert.equal(structuredRole.sourceSalaryMax, 95000);
    assert.equal(structuredRole.sourceSalaryCurrency, "USD");
    assert.equal(structuredRole.sourceSalaryPeriod, "year");
    assert.equal(structuredRole.sourceExperienceYearsMin, 3);
    assert.equal(structuredRole.sourceEmploymentType, "contract");
    console.log(
      "ok - a freehire posting's structured countries, work mode and employment type round-trip through the DB",
    );

    let fetchFullDescriptionCalls = 0;
    const fetchFullDescription = async (sourceId: string) => {
      fetchFullDescriptionCalls++;
      return `<p>Full untruncated description for ${sourceId}.</p>`;
    };
    await store.savePostings(
      userId,
      [
        {
          source: "freehire",
          sourceId: "fh-truncated-role",
          title: "Truncated Description Role",
          company: "FreehireCo",
          location: "Remote",
          snippet: "A posting whose search-result description is only a preview.",
          descriptionHtml: "<p>This is cut off mid-sent",
          link: "https://freehire.me/jobs/truncated-role",
        },
      ],
      fetchFullDescription,
    );
    const afterFirstSave = await store.getPendingPostings(userId, 20);
    const truncatedRole = afterFirstSave.find((p) => p.title === "Truncated Description Role")!;
    const [truncatedRow] = await db()
      .select({ descriptionHtml: jobPostings.descriptionHtml })
      .from(jobPostings)
      .where(eq(jobPostings.id, truncatedRole.id));
    assert.equal(truncatedRow!.descriptionHtml, "<p>Full untruncated description for fh-truncated-role.</p>");
    assert.equal(fetchFullDescriptionCalls, 1, "called once, for the genuinely new posting");

    await store.savePostings(
      userId,
      [
        {
          source: "freehire",
          sourceId: "fh-truncated-role",
          title: "Truncated Description Role",
          company: "FreehireCo",
          location: "Remote",
          snippet: "A posting whose search-result description is only a preview.",
          descriptionHtml: "<p>This is cut off mid-sent",
          link: "https://freehire.me/jobs/truncated-role",
        },
      ],
      fetchFullDescription,
    );
    assert.equal(fetchFullDescriptionCalls, 1, "not called again for a posting already saved from an earlier poll");
    console.log(
      "ok - savePostings fetches the complete description once for a genuinely new posting, never again for one already saved",
    );

    const structuredRoleListed = (await store.listPostings(userId, "new")).find(
      (p) => p.title === "Structured Fields Role",
    )!;
    assert.deepEqual(structuredRoleListed.skills, ["typescript", "react", "postgresql"]);
    assert.equal(structuredRoleListed.sourcePostedAt?.toISOString(), "2026-10-30T09:00:00.000Z");
    assert.equal(structuredRoleListed.sourceUpdatedAt?.toISOString(), "2026-10-31T14:47:09.000Z");
    console.log("ok - a freehire posting's skills and posted/updated timestamps round-trip through the DB");

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
      shift: "Not listed",
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
      roles: [],
      seniority: ["junior", "mid", "senior", "lead"],
      skipWords: [],
      skipCompanies: [],
      countries: ["PH"],
      shifts: ["day", "mid"],
      postedWithinDays: 365,
      minimumPay: 80000,
      maximumPay: null,
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
      shift: "Not listed",
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
      null,
      "a processed posting that states no eligibility at all is shown, not filtered",
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
      roles: [],
      seniority: ["junior", "mid", "senior", "lead"],
      skipWords: [],
      skipCompanies: [],
      countries: [],
      shifts: ["day", "mid"],
      postedWithinDays: 365,
      minimumPay: 80000,
      maximumPay: null,
      payCurrency: "USD",
      payPeriod: "year",
      jobTypes: ["full_time", "contract"],
      workSetups: ["remote"],
      agenciesHide: true,
    });
    await store.refilterExisting(userId);
    const afterCountriesCleared = await store.listPostings(userId, "new");
    assert.ok(
      afterCountriesCleared.some((p) => p.title === "Wrong Country Role"),
      "clearing Countries back to empty re-admits a posting that was only hidden for its country, without a new save",
    );
    console.log("ok - clearing the Countries list refilters already-saved postings back into New");

    await preferences.savePreferences(userId, {
      roles: [],
      seniority: ["junior", "mid", "senior", "lead"],
      skipWords: [],
      skipCompanies: [],
      countries: [],
      shifts: ["day", "mid"],
      postedWithinDays: 365,
      minimumPay: 80000,
      maximumPay: null,
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

    await preferences.savePreferences(userId, {
      roles: [],
      seniority: ["junior", "mid", "senior", "lead"],
      skipWords: [],
      skipCompanies: [],
      countries: [],
      shifts: ["day", "mid"],
      postedWithinDays: 365,
      minimumPay: 15000,
      maximumPay: 200000,
      payCurrency: "PHP",
      payPeriod: "month",
      jobTypes: ["full_time", "contract"],
      workSetups: ["remote"],
      agenciesHide: false,
    });
    await store.savePostings(userId, [
      {
        source: "linkedin",
        sourceId: "li-within-pay-band",
        title: "Within Pay Band Role",
        company: "SliceTwoCo",
        location: "Remote",
        snippet: "",
        link: "https://www.linkedin.com/jobs/view/27",
      },
      {
        source: "linkedin",
        sourceId: "li-above-max-pay",
        title: "Above Max Pay Role",
        company: "SliceTwoCo",
        location: "Remote",
        snippet: "",
        link: "https://www.linkedin.com/jobs/view/28",
      },
    ]);
    const maxPayPending = await store.getPendingPostings(userId, 20);
    const byTitleMaxPay = (title: string) => maxPayPending.find((p) => p.title === title)!;
    await store.saveExtractedFields(byTitleMaxPay("Within Pay Band Role").id, {
      ...extractDefaults,
      payAmount: 50000,
      payCurrency: "PHP",
      payPeriod: "month",
      jobType: "full_time",
      workSetup: "remote",
      countries: ["PH"],
      isAgency: false,
    });
    await store.saveExtractedFields(byTitleMaxPay("Above Max Pay Role").id, {
      ...extractDefaults,
      payAmount: 250000,
      payCurrency: "PHP",
      payPeriod: "month",
      jobType: "full_time",
      workSetup: "remote",
      countries: ["PH"],
      isAgency: false,
    });
    const maxPayFilteredOut = await store.listPostings(userId, "filtered_out");
    const maxPayNew = await store.listPostings(userId, "new");
    const reasonForMaxPay = (title: string) =>
      maxPayFilteredOut.find((p) => p.title === title)?.filterReason ??
      (maxPayNew.some((p) => p.title === title) ? null : undefined);
    assert.equal(reasonForMaxPay("Within Pay Band Role"), null, "a posting inside the 15k-200k PHP/month band passes");
    assert.equal(reasonForMaxPay("Above Max Pay Role"), "Above maximum pay");
    console.log("ok - a posting above Maximum pay is filtered out, one inside the minimum/maximum band is not");

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
      roles: [],
      seniority: ["junior", "mid", "senior", "lead"],
      skipWords: [],
      skipCompanies: [],
      countries: [],
      shifts: ["day", "mid"],
      postedWithinDays: 365,
      minimumPay: 80000,
      maximumPay: null,
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
      "a posting that states PH eligibility is still shown when the owner hasn't chosen any Countries",
    );
    console.log("ok - a posting's own stated pay converts through the cached rates regardless of its currency");

    if (originalRatesRow) {
      await currencyRatesStore.saveCachedRates(originalRatesRow.rates, originalRatesRow.fetchedAt);
      console.log("ok - the real cached currency rates are restored after the test overwrote them");
    }

    await preferences.savePreferences(userId, {
      roles: [],
      seniority: ["junior", "mid", "senior", "lead"],
      skipWords: [],
      skipCompanies: [],
      countries: [],
      shifts: ["day", "mid"],
      postedWithinDays: 365,
      minimumPay: 80000,
      maximumPay: null,
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

    assert.equal(await checkStatusStore.getCheckStatus(userId), null, "a user who's never been checked has no status");
    await checkStatusStore.recordCheck(userId, { ok: true, reason: "ok", found: 3 });
    const afterFirstCheck = await checkStatusStore.getCheckStatus(userId);
    assert.equal(afterFirstCheck?.ok, true);
    assert.equal(afterFirstCheck?.reason, "ok");
    assert.equal(afterFirstCheck?.found, 3);
    assert.equal(afterFirstCheck?.checkCount, 1);
    assert.ok(afterFirstCheck?.checkedAt instanceof Date);
    assert.deepEqual(afterFirstCheck?.firstCheckedAt, afterFirstCheck?.checkedAt);
    assert.deepEqual(afterFirstCheck?.lastOkAt, afterFirstCheck?.checkedAt);
    console.log("ok - the first recorded check creates a status row, counted once, with lastOkAt set");

    await checkStatusStore.recordCheck(userId, { ok: false, reason: "bad secret", found: 0 });
    const afterSecondCheck = await checkStatusStore.getCheckStatus(userId);
    assert.equal(afterSecondCheck?.ok, false);
    assert.equal(afterSecondCheck?.reason, "bad secret");
    assert.equal(afterSecondCheck?.checkCount, 2, "the count increments, it isn't reset by a failure");
    assert.deepEqual(
      afterSecondCheck?.firstCheckedAt,
      afterFirstCheck?.firstCheckedAt,
      "firstCheckedAt never moves once set",
    );
    assert.deepEqual(
      afterSecondCheck?.lastOkAt,
      afterFirstCheck?.lastOkAt,
      "a failure never erases when the pipeline last actually worked",
    );
    assert.ok(
      afterSecondCheck!.checkedAt.getTime() >= afterFirstCheck!.checkedAt.getTime(),
      "recording again updates the same row's time forward, not back",
    );
    console.log(
      "ok - recording a second, failing check updates the status in place, counting up and preserving lastOkAt",
    );

    const distinctCompanies = await store.getDistinctCompanies(userId);
    assert.deepEqual(
      distinctCompanies,
      [...new Set(distinctCompanies)].sort(),
      "every company this user's postings have is returned once, alphabetically",
    );
    assert.ok(distinctCompanies.includes("SliceThreeCo"), "includes a company saved earlier in this run");
    console.log("ok - getDistinctCompanies returns every distinct company name for the Skip companies filter");
  } finally {
    await db().delete(users).where(eq(users.id, userId));
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

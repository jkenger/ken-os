import { emptyProfile, type ProfileDetails } from "@ken-os/domain";
import {
  PORTFOLIO_SNAPSHOT_VERSION,
  type PortfolioEngineering,
  type PortfolioProfile,
  type PortfolioResume,
  type PortfolioSnapshot,
} from "@ken-os/portfolio";
import type { ReviewSheet } from "@/features/engineering-lab/review-sheet";
import type { RoadmapView } from "@/features/engineering-lab/roadmap-store";

// Builds the public snapshot from the saved Profile. It copies allowed fields one by one and never spreads a record, so
// a field added to the Profile later stays private until it is added here. Spec: docs/architecture/portfolio.md.

/** What the owner chose to publish beyond the default. */
export interface PublishChoices {
  showEmail: boolean;
}

export function portfolioProfile(details: ProfileDetails, choices: PublishChoices): PortfolioProfile {
  const { contact } = details;
  return {
    name: contact.fullName,
    headline: contact.headline,
    ...(choices.showEmail && contact.email ? { email: contact.email } : {}),
    location: [contact.city, contact.country].filter(Boolean).join(", "),
    summary: details.summary,
    links: contact.links.map(({ label, url }) => ({ label, url })),
    experience: details.experience.map(({ company, title, location, start, end, bullets }) => ({
      company,
      title,
      location,
      start,
      end,
      bullets: [...bullets],
    })),
    education: details.education.map(({ school, degree, field, start, end }) => ({
      school,
      degree,
      field,
      start,
      end,
    })),
    skills: details.skills.map(({ name, items }) => ({ name, items: [...items] })),
    projects: details.projects.map(({ name, link, description, bullets }) => ({
      name,
      link,
      description,
      bullets: [...bullets],
    })),
    certifications: details.certifications.map(({ name, issuer, date }) => ({ name, issuer, date })),
    languages: details.languages.map(({ name, level }) => ({ name, level })),
  };
}

/** What Engineering publishes: the roadmaps shown, each topic's latest review, and only the explanations switched on. */
export interface EngineeringSource {
  roadmaps: RoadmapView[];
  reviews: Map<string, ReviewSheet>;
  explanations: Map<string, string>;
}

export function portfolioEngineering({ roadmaps, reviews, explanations }: EngineeringSource): PortfolioEngineering {
  return {
    roadmaps: roadmaps.map((roadmap) => ({
      goal: roadmap.goal?.title ?? "",
      counts: {
        learned: roadmap.counts.learned,
        inProgress: roadmap.counts.inProgress,
        total: roadmap.counts.total,
      },
      chapters: roadmap.chapters.map((chapter) => ({
        title: chapter.title,
        area: chapter.area,
        topics: chapter.topics.map((topic) => {
          const review = reviews.get(topic.id);
          const explanation = explanations.get(topic.id);
          return {
            id: topic.id,
            title: topic.title,
            status: topic.status,
            learnedAt: topic.learnedAt,
            // Point ids and the ownMistake flag stay private: the site needs only what each point says.
            review: review
              ? {
                  points: review.points.map(({ question, explanation, example, mistake }) => ({
                    question,
                    explanation,
                    example,
                    mistake,
                  })),
                  terms: review.terms.map(({ term, meaning }) => ({ term, meaning })),
                }
              : null,
            ...(explanation ? { explanation } : {}),
          };
        }),
      })),
    })),
  };
}

export function buildSnapshot(
  details: ProfileDetails,
  resume: PortfolioResume,
  choices: PublishChoices,
  publication: number,
  publishedAt: Date,
  engineering: PortfolioEngineering = { roadmaps: [] },
): PortfolioSnapshot {
  return {
    version: PORTFOLIO_SNAPSHOT_VERSION,
    publication,
    publishedAt: publishedAt.toISOString(),
    profile: portfolioProfile(details, choices),
    resume: { template: resume.template, paper: resume.paper },
    engineering,
  };
}

/** The published Profile back in the shape the resume renderer prints. Only what was published is in it, so the
 *  public PDF can't show anything the snapshot left out. */
export function publishedResumeDetails(profile: PortfolioProfile): ProfileDetails {
  const details = emptyProfile();
  details.contact = {
    ...details.contact,
    fullName: profile.name,
    headline: profile.headline,
    email: profile.email ?? "",
    city: profile.location,
    links: profile.links.map(({ label, url }) => ({ label, url })),
  };
  details.summary = profile.summary;
  details.experience = profile.experience.map((role) => ({ ...role, bullets: [...role.bullets] }));
  details.education = profile.education.map((school) => ({ ...school, notes: "" }));
  details.skills = profile.skills.map(({ name, items }) => ({ name, items: [...items] }));
  details.projects = profile.projects.map((project) => ({ ...project, bullets: [...project.bullets] }));
  details.certifications = profile.certifications.map((cert) => ({ ...cert }));
  details.languages = profile.languages.map((language) => ({ ...language }));
  return details;
}

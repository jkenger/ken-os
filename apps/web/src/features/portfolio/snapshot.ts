import { emptyProfile, type ProfileDetails } from "@ken-os/domain";
import {
  PORTFOLIO_SNAPSHOT_VERSION,
  type PortfolioProfile,
  type PortfolioResume,
  type PortfolioSnapshot,
} from "@ken-os/portfolio";

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

export function buildSnapshot(
  details: ProfileDetails,
  resume: PortfolioResume,
  choices: PublishChoices,
  publication: number,
  publishedAt: Date,
): PortfolioSnapshot {
  return {
    version: PORTFOLIO_SNAPSHOT_VERSION,
    publication,
    publishedAt: publishedAt.toISOString(),
    profile: portfolioProfile(details, choices),
    resume: { template: resume.template, paper: resume.paper },
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

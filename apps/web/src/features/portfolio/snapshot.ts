import type { ProfileDetails } from "@ken-os/domain";
import { PORTFOLIO_SNAPSHOT_VERSION, type PortfolioProfile, type PortfolioSnapshot } from "@ken-os/portfolio";

// Builds the public snapshot from the saved Profile. It copies allowed fields one by one and never spreads a record, so
// a field added to the Profile later stays private until it is added here. Spec: docs/architecture/portfolio.md.

export function portfolioProfile(details: ProfileDetails): PortfolioProfile {
  const { contact } = details;
  return {
    name: contact.fullName,
    headline: contact.headline,
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

export function buildSnapshot(details: ProfileDetails, publication: number, publishedAt: Date): PortfolioSnapshot {
  return {
    version: PORTFOLIO_SNAPSHOT_VERSION,
    publication,
    publishedAt: publishedAt.toISOString(),
    profile: portfolioProfile(details),
  };
}

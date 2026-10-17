import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  contactLine,
  printDateRange,
  printMonth,
  SECTION_HEADINGS,
  sectionsToPrint,
  type PaperSize,
  type ProfileDetails,
  type ResumeSection,
  type ResumeTemplate,
} from "@ken-os/domain";

// The resume PDF. One column, standard headings, built-in fonts, real text and no header, footer, table, icon or
// photo, so an ATS reads it the way a person does. The three templates differ only in density and section order.
// Spec: docs/product/profile-resume.md, "Templates".

const PAPER: Record<PaperSize, "LETTER" | "A4"> = { letter: "LETTER", a4: "A4" };

/** Type size and spacing per template. Compact fits a long history on one page. */
const DENSITY: Record<ResumeTemplate, { body: number; name: number; margin: number; gap: number }> = {
  classic: { body: 10.5, name: 20, margin: 48, gap: 12 },
  compact: { body: 9.5, name: 17, margin: 36, gap: 8 },
  technical: { body: 10, name: 19, margin: 44, gap: 11 },
};

function stylesFor(template: ResumeTemplate) {
  const { body, name, margin, gap } = DENSITY[template];
  return StyleSheet.create({
    page: { padding: margin, fontFamily: "Helvetica", fontSize: body, lineHeight: 1.35, color: "#111111" },
    name: { fontFamily: "Helvetica-Bold", fontSize: name, lineHeight: 1.1 },
    headline: { fontSize: body + 1, marginTop: 3 },
    contact: { marginTop: 4, color: "#333333" },
    section: { marginTop: gap },
    heading: {
      fontFamily: "Helvetica-Bold",
      fontSize: body + 0.5,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      borderBottomWidth: 0.75,
      borderBottomColor: "#999999",
      paddingBottom: 2,
      marginBottom: 5,
    },
    entry: { marginBottom: gap * 0.6 },
    row: { flexDirection: "row", justifyContent: "space-between" },
    strong: { fontFamily: "Helvetica-Bold" },
    muted: { color: "#444444" },
    bullet: { flexDirection: "row", marginTop: 1.5 },
    mark: { width: 10 },
    bulletText: { flex: 1 },
  });
}

type Styles = ReturnType<typeof stylesFor>;

function Bullets({ lines, s }: { lines: string[]; s: Styles }) {
  return (
    <>
      {lines.map((line, index) => (
        <View key={index} style={s.bullet} wrap={false}>
          <Text style={s.mark}>•</Text>
          <Text style={s.bulletText}>{line}</Text>
        </View>
      ))}
    </>
  );
}

/** A title line with the dates on the right, the way recruiters scan for them. */
function TitleRow({ title, dates, s }: { title: string; dates: string; s: Styles }) {
  return (
    <View style={s.row}>
      <Text style={s.strong}>{title}</Text>
      {dates ? <Text style={s.muted}>{dates}</Text> : null}
    </View>
  );
}

function Section({ section, details, s }: { section: ResumeSection; details: ProfileDetails; s: Styles }) {
  const body = {
    summary: <Text>{details.summary}</Text>,
    experience: details.experience.map((role, index) => (
      <View key={index} style={s.entry}>
        <TitleRow
          title={[role.title, role.company].filter(Boolean).join(", ")}
          dates={printDateRange(role.start, role.end)}
          s={s}
        />
        {role.location ? <Text style={s.muted}>{role.location}</Text> : null}
        <Bullets lines={role.bullets} s={s} />
      </View>
    )),
    education: details.education.map((school, index) => (
      <View key={index} style={s.entry} wrap={false}>
        <TitleRow title={school.school} dates={printDateRange(school.start, school.end)} s={s} />
        {school.degree || school.field ? <Text>{[school.degree, school.field].filter(Boolean).join(", ")}</Text> : null}
        {school.notes ? <Text style={s.muted}>{school.notes}</Text> : null}
      </View>
    )),
    skills: details.skills.map((group, index) => (
      <Text key={index}>
        {group.name ? <Text style={s.strong}>{group.name}: </Text> : null}
        {group.items.join(", ")}
      </Text>
    )),
    projects: details.projects.map((project, index) => (
      <View key={index} style={s.entry}>
        <TitleRow title={project.name} dates="" s={s} />
        {project.link ? <Text style={s.muted}>{project.link.replace(/^https?:\/\//, "")}</Text> : null}
        {project.description ? <Text>{project.description}</Text> : null}
        <Bullets lines={project.bullets} s={s} />
      </View>
    )),
    certifications: details.certifications.map((cert, index) => (
      <TitleRow
        key={index}
        title={[cert.name, cert.issuer].filter(Boolean).join(", ")}
        dates={cert.date ? printMonth(cert.date) : ""}
        s={s}
      />
    )),
    languages: (
      <Text>
        {details.languages
          .map((language) => (language.level ? `${language.name} (${language.level})` : language.name))
          .join(", ")}
      </Text>
    ),
  }[section];
  return (
    <View style={s.section}>
      <Text style={s.heading} minPresenceAhead={24}>
        {SECTION_HEADINGS[section]}
      </Text>
      {body}
    </View>
  );
}

export function ResumeDocument({
  details,
  template,
  paper,
}: {
  details: ProfileDetails;
  template: ResumeTemplate;
  paper: PaperSize;
}) {
  const s = stylesFor(template);
  const contact = contactLine(details);
  return (
    <Document
      title={`${details.contact.fullName || "Resume"} Resume`}
      author={details.contact.fullName}
      creator="Loots"
      producer="Loots"
    >
      <Page size={PAPER[paper]} style={s.page}>
        <Text style={s.name}>{details.contact.fullName}</Text>
        {details.contact.headline ? <Text style={s.headline}>{details.contact.headline}</Text> : null}
        {contact.length ? <Text style={s.contact}>{contact.join("  |  ")}</Text> : null}
        {sectionsToPrint(details, template).map((section) => (
          <Section key={section} section={section} details={details} s={s} />
        ))}
      </Page>
    </Document>
  );
}

/** The resume as PDF bytes. */
export async function renderResumePdf(
  details: ProfileDetails,
  template: ResumeTemplate,
  paper: PaperSize,
): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument details={details} template={template} paper={paper} />);
}

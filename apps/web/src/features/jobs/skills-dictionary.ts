export type SkillEntry = {
  /** The canonical key, already basic-normalized (lowercase, alphanumeric only). */
  slug: string;
  /** The proper display form -- "AI", "Node.js", "GitHub Actions". */
  name: string;
  /** Other raw spellings that mean this same skill ("node", "node.js", "nodejs" all land here). Each one is
   *  basic-normalized before comparing, so case and punctuation never matter. */
  aliases: string[];
  /** A loose grouping used for "related, not missing" matching -- two skills in the same family are close enough
   *  to credit (React vs Vue), not close enough to call the same skill. */
  family: string | null;
  /** A Simple Icons (simpleicons.org) slug, e.g. "docker" -- the CDN URL (`https://cdn.simpleicons.org/<slug>`)
   *  is built wherever this is actually rendered, never fetched or guessed here. */
  logoSlug: string | null;
  description: string | null;
};

function basicNormalize(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const DICTIONARY: SkillEntry[] = [
  // Languages
  {
    slug: "typescript",
    name: "TypeScript",
    aliases: ["ts"],
    family: "language",
    logoSlug: "typescript",
    description: "A typed superset of JavaScript that compiles to plain JavaScript.",
  },
  {
    slug: "javascript",
    name: "JavaScript",
    aliases: ["js"],
    family: "language",
    logoSlug: "javascript",
    description: "The scripting language of the web.",
  },
  {
    slug: "python",
    name: "Python",
    aliases: ["py"],
    family: "language",
    logoSlug: "python",
    description: "A general-purpose language known for readability.",
  },
  {
    slug: "java",
    name: "Java",
    aliases: [],
    family: "jvm-language",
    logoSlug: "openjdk",
    description: "A statically typed, object-oriented language that runs on the JVM.",
  },
  {
    slug: "kotlin",
    name: "Kotlin",
    aliases: [],
    family: "jvm-language",
    logoSlug: "kotlin",
    description: "A statically typed language, fully interoperable with Java, running on the JVM.",
  },
  {
    slug: "go",
    name: "Go",
    aliases: ["golang"],
    family: "language",
    logoSlug: "go",
    description: "A compiled, statically typed language built for simplicity and concurrency.",
  },
  {
    slug: "rust",
    name: "Rust",
    aliases: [],
    family: "language",
    logoSlug: "rust",
    description: "A systems language focused on memory safety without a garbage collector.",
  },
  {
    slug: "php",
    name: "PHP",
    aliases: [],
    family: "language",
    logoSlug: "php",
    description: "A scripting language widely used for server-side web development.",
  },
  {
    slug: "ruby",
    name: "Ruby",
    aliases: [],
    family: "language",
    logoSlug: "ruby",
    description: "A dynamic, object-oriented language known for developer happiness.",
  },
  {
    slug: "csharp",
    name: "C#",
    aliases: ["c#", "cs"],
    family: "dotnet-language",
    logoSlug: "csharp",
    description: "A statically typed language built for the .NET platform.",
  },

  // AI
  {
    slug: "ai",
    name: "AI",
    aliases: ["artificialintelligence"],
    family: "ai",
    logoSlug: null,
    description: "Artificial intelligence: building systems that perform tasks requiring human-like judgment.",
  },
  {
    slug: "machinelearning",
    name: "Machine Learning",
    aliases: ["ml"],
    family: "ai",
    logoSlug: null,
    description: "Building systems that improve at a task from data rather than explicit rules.",
  },
  {
    slug: "llm",
    name: "LLM",
    aliases: ["largelanguagemodel", "largelanguagemodels"],
    family: "ai",
    logoSlug: null,
    description: "Large language models, the kind of model behind modern AI chat and code assistants.",
  },
  {
    slug: "githubcopilot",
    name: "Github Copilot",
    aliases: ["copilot"],
    family: "ai-coding-assistant",
    logoSlug: "githubcopilot",
    description: "GitHub's AI pair-programming assistant, built into popular editors.",
  },

  // Frontend frameworks
  {
    slug: "react",
    name: "React",
    aliases: ["reactjs"],
    family: "frontend-framework",
    logoSlug: "react",
    description: "A component-based library for building user interfaces.",
  },
  {
    slug: "vue",
    name: "Vue",
    aliases: ["vuejs"],
    family: "frontend-framework",
    logoSlug: "vuedotjs",
    description: "A progressive framework for building user interfaces.",
  },
  {
    slug: "angular",
    name: "Angular",
    aliases: ["angularjs"],
    family: "frontend-framework",
    logoSlug: "angular",
    description: "A full-featured framework for building single-page applications.",
  },
  {
    slug: "svelte",
    name: "Svelte",
    aliases: [],
    family: "frontend-framework",
    logoSlug: "svelte",
    description: "A framework that compiles components to small, dependency-free vanilla JS.",
  },
  {
    slug: "nextjs",
    name: "Next.js",
    aliases: ["next"],
    family: "meta-framework",
    logoSlug: "nextdotjs",
    description: "A React framework for server rendering, routing and full-stack apps.",
  },

  // Backend runtimes
  {
    slug: "nodejs",
    name: "Node.js",
    aliases: ["node", "nodejs", "node.js"],
    family: "backend-runtime",
    logoSlug: "nodedotjs",
    description: "A JavaScript runtime built on Chrome's V8 engine, for server-side code.",
  },
  {
    slug: "deno",
    name: "Deno",
    aliases: [],
    family: "backend-runtime",
    logoSlug: "deno",
    description: "A secure-by-default JavaScript and TypeScript runtime.",
  },
  {
    slug: "bun",
    name: "Bun",
    aliases: [],
    family: "backend-runtime",
    logoSlug: "bun",
    description: "A fast all-in-one JavaScript runtime, bundler and package manager.",
  },

  // Databases
  {
    slug: "postgresql",
    name: "PostgreSQL",
    aliases: ["postgres"],
    family: "sql-database",
    logoSlug: "postgresql",
    description: "An open-source relational database known for standards compliance and extensibility.",
  },
  {
    slug: "mysql",
    name: "MySQL",
    aliases: [],
    family: "sql-database",
    logoSlug: "mysql",
    description: "A widely used open-source relational database.",
  },
  {
    slug: "sqlite",
    name: "SQLite",
    aliases: [],
    family: "sql-database",
    logoSlug: "sqlite",
    description: "A self-contained, serverless SQL database engine.",
  },
  {
    slug: "mongodb",
    name: "MongoDB",
    aliases: ["mongo"],
    family: "nosql-database",
    logoSlug: "mongodb",
    description: "A document-oriented NoSQL database.",
  },
  {
    slug: "redis",
    name: "Redis",
    aliases: [],
    family: "nosql-database",
    logoSlug: "redis",
    description: "An in-memory key-value store, often used for caching and queues.",
  },

  // Containers / orchestration / cloud
  {
    slug: "docker",
    name: "Docker",
    aliases: [],
    family: "container",
    logoSlug: "docker",
    description: "A platform for packaging and running applications in containers.",
  },
  {
    slug: "kubernetes",
    name: "Kubernetes",
    aliases: ["k8s"],
    family: "orchestration",
    logoSlug: "kubernetes",
    description: "A system for automating deployment, scaling and management of containerized apps.",
  },
  {
    slug: "aws",
    name: "AWS",
    aliases: ["amazonwebservices"],
    family: "cloud-provider",
    logoSlug: "amazonwebservices",
    description: "Amazon's cloud computing platform.",
  },
  {
    slug: "gcp",
    name: "GCP",
    aliases: ["googlecloud", "googlecloudplatform"],
    family: "cloud-provider",
    logoSlug: "googlecloud",
    description: "Google's cloud computing platform.",
  },
  {
    slug: "azure",
    name: "Azure",
    aliases: ["microsoftazure"],
    family: "cloud-provider",
    logoSlug: "microsoftazure",
    description: "Microsoft's cloud computing platform.",
  },
  {
    slug: "terraform",
    name: "Terraform",
    aliases: [],
    family: "infrastructure-as-code",
    logoSlug: "terraform",
    description: "A tool for defining and provisioning infrastructure as code.",
  },

  // CI/CD and source control
  {
    slug: "githubactions",
    name: "GitHub Actions",
    aliases: [],
    family: "ci-cd",
    logoSlug: "githubactions",
    description: "GitHub's built-in CI/CD automation.",
  },
  {
    slug: "gitlabci",
    name: "GitLab CI",
    aliases: [],
    family: "ci-cd",
    logoSlug: "gitlab",
    description: "GitLab's built-in CI/CD automation.",
  },
  {
    slug: "jenkins",
    name: "Jenkins",
    aliases: [],
    family: "ci-cd",
    logoSlug: "jenkins",
    description: "An open-source automation server for CI/CD pipelines.",
  },
  {
    slug: "cicd",
    name: "CI/CD",
    aliases: ["continuousintegration", "continuousdeployment", "continuousdelivery"],
    family: "ci-cd",
    logoSlug: null,
    description: "Continuous integration and continuous delivery/deployment practices.",
  },
  {
    slug: "git",
    name: "Git",
    aliases: [],
    family: "version-control",
    logoSlug: "git",
    description: "A distributed version control system.",
  },

  // API styles
  {
    slug: "graphql",
    name: "GraphQL",
    aliases: [],
    family: "api-style",
    logoSlug: "graphql",
    description: "A query language for APIs and a runtime for fulfilling those queries.",
  },
  {
    slug: "rest",
    name: "REST",
    aliases: ["restapi", "restfulapi"],
    family: "api-style",
    logoSlug: null,
    description: "An architectural style for HTTP APIs built around resources.",
  },
  {
    slug: "api",
    name: "API",
    aliases: [],
    family: "api-style",
    logoSlug: null,
    description: "An application programming interface -- how one piece of software talks to another.",
  },

  // Other common acronyms and proper names this dictionary's fallback would otherwise mis-case
  {
    slug: "github",
    name: "GitHub",
    aliases: [],
    family: "version-control",
    logoSlug: "github",
    description: "A hosting platform for Git repositories.",
  },
  {
    slug: "sql",
    name: "SQL",
    aliases: [],
    family: "sql-database",
    logoSlug: null,
    description: "Structured Query Language, for reading and writing relational databases.",
  },
  {
    slug: "rdbms",
    name: "RDBMS",
    aliases: [],
    family: "sql-database",
    logoSlug: null,
    description: "Relational database management system, the category PostgreSQL and MySQL belong to.",
  },
  {
    slug: "rabbitmq",
    name: "RabbitMQ",
    aliases: [],
    family: "message-queue",
    logoSlug: "rabbitmq",
    description: "An open-source message broker for asynchronous communication between services.",
  },
  {
    slug: "wordpress",
    name: "WordPress",
    aliases: [],
    family: "cms",
    logoSlug: "wordpress",
    description: "An open-source content management system.",
  },
  {
    slug: "argocd",
    name: "ArgoCD",
    aliases: [],
    family: "ci-cd",
    logoSlug: "argo",
    description: "A declarative GitOps continuous delivery tool for Kubernetes.",
  },
];

const BY_ALIAS = new Map<string, SkillEntry>();
for (const entry of DICTIONARY) {
  for (const alias of [entry.slug, ...entry.aliases]) BY_ALIAS.set(basicNormalize(alias), entry);
}

function lookup(raw: string): SkillEntry | undefined {
  return BY_ALIAS.get(basicNormalize(raw));
}

/** The dictionary entry for a skill, or `null` for one this dictionary doesn't know -- never a guess. */
export function skillEntry(raw: string): SkillEntry | null {
  return lookup(raw) ?? null;
}

/** A stable, comparable key for a skill: the dictionary's own slug when known (so every alias of "Node.js"
 *  normalizes together), otherwise a basic-normalized form of the raw text. */
export function normalizeSkill(raw: string): string {
  return lookup(raw)?.slug ?? basicNormalize(raw);
}

function titleCaseFallback(raw: string): string {
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** The proper display form of a skill: the dictionary's own name when known ("ai" -> "AI", "nodejs" -> "Node.js"),
 *  otherwise a best-effort title case of the raw text, split on hyphens/underscores/spaces. */
export function formatSkillName(raw: string): string {
  return lookup(raw)?.name ?? titleCaseFallback(raw);
}

import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  bulletListMarker: "-",
});

turndownService.addRule("strikethrough", {
  filter: (node) =>
    node.nodeName === "DEL" || node.nodeName === "S" || node.nodeName === "STRIKE",
  replacement: (content) => `~~${content}~~`,
});

export interface ConvertResult {
  markdown: string;
  title: string;
  source: string;
}

interface TreeEntry {
  path: string;
  type: string;
  size?: number;
}

interface FileContent {
  path: string;
  content: string;
  language: string;
}

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".github", ".gitlab", "dist", "build", "out",
  ".next", ".nuxt", "coverage", ".cache", "__pycache__", ".tox", "vendor",
  ".idea", ".vscode", "target", "bin", "obj", ".gradle", ".m2",
  "bower_components", "jspm_packages", ".serverless", ".webpack",
]);

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".bz2", ".rar", ".7z",
  ".exe", ".dll", ".so", ".dylib", ".bin",
  ".dat", ".db", ".sqlite", ".sqlite3",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".mp3", ".mp4", ".avi", ".mov", ".wmv", ".flv", ".swf",
  ".min.js", ".min.css", ".map", ".lock",
]);

const ENTRY_PATTERNS = [
  /^index\.(ts|tsx|js|jsx|mjs|cjs)$/,
  /^main\.(ts|tsx|js|jsx|mjs|cjs)$/,
  /^app\.(ts|tsx|js|jsx|mjs|cjs)$/,
  /^server\.(ts|tsx|js|jsx|mjs|cjs)$/,
  /^cli\.(ts|tsx|js|jsx|mjs|cjs)$/,
  /^__main__\.py$/,
  /^main\.py$/,
  /^app\.py$/,
  /^server\.py$/,
  /^mod\.rs$/,
  /^lib\.rs$/,
  /^main\.rs$/,
  /^main\.go$/,
  /^app\.go$/,
  /^server\.go$/,
  /^Gemfile$/,
  /^Rakefile$/,
  /^pom\.xml$/,
  /^build\.gradle$/,
];

const CONFIG_FILES = new Set([
  "package.json", "tsconfig.json", "jsconfig.json", "turbo.json",
  "next.config.js", "next.config.mjs", "next.config.ts",
  "nuxt.config.js", "nuxt.config.ts",
  "vite.config.js", "vite.config.ts",
  "webpack.config.js", "webpack.config.ts",
  "rollup.config.js", "rollup.config.ts",
  ".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.yml",
  ".prettierrc", ".prettierrc.js", ".prettierrc.json",
  ".babelrc", "babel.config.js",
  "tailwind.config.js", "tailwind.config.ts",
  "postcss.config.js", "postcss.config.mjs",
  ".env.example", ".env.sample",
  "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
  "Makefile", "CMakeLists.txt",
  "requirements.txt", "setup.py", "setup.cfg", "pyproject.toml", "Pipfile",
  "Cargo.toml", "go.mod", "go.sum",
  "Gemfile", "composer.json",
  "build.gradle", "pom.xml",
]);

const ALWAYS_READ = new Set([
  "README.md", "readme.md", "Readme.md",
  "CONTRIBUTING.md", "CONTRIBUTORS.md",
  "LICENSE", "LICENSE.md", "LICENSE.txt", "LICENSE-MIT",
  "CHANGELOG.md", "CHANGES.md",
  ".gitignore", ".dockerignore",
]);

const LANG_MAP: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript",
  ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
  ".py": "python", ".pyw": "python",
  ".rs": "rust",
  ".go": "go",
  ".java": "java", ".kt": "kotlin", ".scala": "scala",
  ".rb": "ruby",
  ".php": "php",
  ".cs": "csharp", ".fs": "fsharp",
  ".cpp": "cpp", ".cc": "cpp", ".cxx": "cpp", ".c": "c", ".h": "c",
  ".swift": "swift",
  ".dart": "dart",
  ".lua": "lua",
  ".r": "r", ".R": "r",
  ".ex": "elixir", ".exs": "elixir",
  ".erl": "erlang",
  ".hs": "haskell",
  ".ml": "ocaml", ".mli": "ocaml",
  ".clj": "clojure",
  ".zig": "zig",
  ".nim": "nim",
  ".v": "verilog", ".sv": "systemverilog",
  ".vue": "vue",
  ".svelte": "svelte",
  ".astro": "astro",
  ".html": "html", ".htm": "html",
  ".css": "css", ".scss": "scss", ".sass": "sass", ".less": "less",
  ".json": "json", ".jsonc": "json",
  ".yaml": "yaml", ".yml": "yaml",
  ".toml": "toml",
  ".xml": "xml",
  ".sql": "sql",
  ".graphql": "graphql", ".gql": "graphql",
  ".md": "markdown", ".mdx": "markdown",
  ".sh": "bash", ".bash": "bash", ".zsh": "bash",
  ".fish": "fish",
  ".ps1": "powershell",
  ".dockerfile": "dockerfile",
  ".env": "env",
};

const FRAMEWORK_MAP: Record<string, string> = {
  react: "React", "react-dom": "React DOM", "next": "Next.js",
  vue: "Vue.js", nuxt: "Nuxt.js", "@angular/core": "Angular",
  svelte: "Svelte", "@sveltejs/kit": "SvelteKit",
  "@nestjs/core": "NestJS", express: "Express", fastify: "Fastify",
  koa: "Koa", hapi: "Hapi",
  gatsby: "Gatsby", remix: "Remix", solid: "SolidJS",
  tailwindcss: "Tailwind CSS", "styled-components": "Styled Components",
  "emotion": "Emotion", "@emotion/react": "Emotion",
  "framer-motion": "Framer Motion",
  typescript: "TypeScript", prisma: "Prisma",
  trpc: "tRPC", graphql: "GraphQL", apollo: "Apollo",
  axios: "Axios", "socket.io": "Socket.IO",
  jest: "Jest", vitest: "Vitest", mocha: "Mocha", cypress: "Cypress",
  playwright: "Playwright",
  vite: "Vite", webpack: "Webpack", rollup: "Rollup", esbuild: "esbuild",
  "lerna": "Lerna", "turbo": "Turborepo",
  redux: "Redux", zustand: "Zustand", jotai: "Jotai",
  "react-router": "React Router", "vue-router": "Vue Router",
  "next/router": "Next.js Router",
  "mongoose": "Mongoose", "sequelize": "Sequelize",
  knex: "Knex", "typeorm": "TypeORM",
};

const PYTHON_LIBS: Record<string, string> = {
  django: "Django", flask: "Flask", fastapi: "FastAPI",
  tornado: "Tornado", sqlalchemy: "SQLAlchemy",
  celery: "Celery", pytest: "Pytest", numpy: "NumPy",
  pandas: "Pandas", tensorflow: "TensorFlow", pytorch: "PyTorch",
  scikit: "Scikit-learn", requests: "Requests",
  "python-telegram-bot": "Telegram Bot", aiohttp: "aiohttp",
  uvicorn: "Uvicorn", gunicorn: "Gunicorn",
};

const RUST_CRATES: Record<string, string> = {
  actix: "Actix Web", actix_web: "Actix Web", actix_rt: "Actix Runtime",
  rocket: "Rocket", axum: "Axum", warp: "Warp",
  tokio: "Tokio", async_std: "Async Std",
  serde: "Serde", serde_json: "Serde JSON",
  reqwest: "Reqwest", hyper: "Hyper",
  clap: "Clap", structopt: "StructOpt",
  diesel: "Diesel", sqlx: "SQLx",
  "wasm-bindgen": "Wasm Bindgen", yew: "Yew",
};

const GO_LIBS: Record<string, string> = {
  "github.com/gin-gonic/gin": "Gin",
  "github.com/labstack/echo": "Echo",
  "github.com/gofiber/fiber": "Fiber",
  "github.com/gorilla/mux": "Gorilla Mux",
  "github.com/jmoiron/sqlx": "SQLx",
  "gorm.io/gorm": "GORM",
  "go.uber.org/zap": "Zap",
  "github.com/rs/cors": "CORS",
};

function getLangFromPath(filePath: string): string {
  const ext = "." + filePath.split(".").pop()?.toLowerCase();
  const basename = filePath.split("/").pop() || "";

  if (basename === "Dockerfile") return "dockerfile";
  if (basename === "Makefile" || basename === "Rakefile") return "makefile";
  if (basename.endsWith(".toml")) return "toml";
  if (basename.endsWith(".lock")) return "json";

  return LANG_MAP[ext] || "text";
}

function shouldSkipFile(path: string): boolean {
  const parts = path.split("/");
  for (const part of parts) {
    if (SKIP_DIRS.has(part)) return true;
  }
  const basename = parts[parts.length - 1] || "";
  for (const ext of BINARY_EXTENSIONS) {
    if (basename.endsWith(ext)) return true;
  }
  if (basename.includes(".min.") && (basename.endsWith(".js") || basename.endsWith(".css"))) return true;
  return false;
}

function isKeyFile(path: string): boolean {
  const basename = path.split("/").pop() || "";
  if (ALWAYS_READ.has(basename)) return true;
  if (CONFIG_FILES.has(basename)) return true;
  for (const pattern of ENTRY_PATTERNS) {
    if (pattern.test(basename)) return true;
  }
  return false;
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/#?]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "url-to-md-converter",
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

async function fetchRaw(owner: string, repo: string, branch: string, path: string): Promise<string | null> {
  try {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "url-to-md-converter" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > 150000) {
      const lines = text.split("\n").slice(0, 500);
      return lines.join("\n") + "\n\n// ... (truncated, file too large)";
    }
    return text;
  } catch {
    return null;
  }
}

async function fetchRepoTree(owner: string, repo: string, branch: string): Promise<TreeEntry[]> {
  try {
    const data = await fetchJson<{ tree: TreeEntry[]; truncated: boolean }>(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
    );
    return data.tree || [];
  } catch {
    return [];
  }
}

function buildTreeVisualization(tree: TreeEntry[], maxDepth: number = 3): string {
  const entries = tree
    .filter((e) => e.type === "blob" || e.type === "tree")
    .map((e) => e.path)
    .sort();

  const filtered = entries.filter((path) => {
    if (path.includes("/")) {
      const depth = path.split("/").length - 1;
      if (depth > maxDepth) return false;
      const parts = path.split("/");
      for (let i = 0; i < parts.length - 1; i++) {
        if (SKIP_DIRS.has(parts[i])) return false;
      }
    }
    return true;
  });

  const lines: string[] = [];
  const shownDirs = new Set<string>();

  for (const path of filtered) {
    const parts = path.split("/");
    const basename = parts[parts.length - 1] || "";
    const depth = parts.length - 1;

    for (let i = 0; i < depth; i++) {
      const dirPath = parts.slice(0, i + 1).join("/");
      if (!shownDirs.has(dirPath)) {
        const indent = "│   ".repeat(i);
        lines.push(`${indent}├── ${parts[i]}/`);
        shownDirs.add(dirPath);
      }
    }

    const indent = "│   ".repeat(depth);
    const connector = "├── ";
    lines.push(`${indent}${connector}${basename}`);
  }

  return lines.join("\n");
}

function detectTechsFromCode(sourceFiles: FileContent[]): string[] {
  const techs = new Set<string>();

  for (const file of sourceFiles) {
    if (file.language === "typescript" || file.language === "javascript") {
      for (const [pkg, name] of Object.entries(FRAMEWORK_MAP)) {
        if (file.content.includes(`from "${pkg}"`) || file.content.includes(`from '${pkg}'`) ||
            file.content.includes(`require("${pkg}")`) || file.content.includes(`require('${pkg}')`) ||
            file.content.includes(`import "${pkg}"`) || file.content.includes(`import '${pkg}'`)) {
          techs.add(name);
        }
      }
    } else if (file.language === "python") {
      for (const [pkg, name] of Object.entries(PYTHON_LIBS)) {
        if (file.content.includes(`import ${pkg}`) || file.content.includes(`from ${pkg}`)) {
          techs.add(name);
        }
      }
    } else if (file.language === "rust") {
      for (const [crate, name] of Object.entries(RUST_CRATES)) {
        if (file.content.includes(crate)) techs.add(name);
      }
    } else if (file.language === "go") {
      for (const [dep, name] of Object.entries(GO_LIBS)) {
        if (file.content.includes(dep)) techs.add(name);
      }
    }
  }

  return [...techs];
}

function detectTechsFromPackageJson(content: string): string[] {
  const techs: string[] = [];
  try {
    const pkg = JSON.parse(content);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [pkgName, name] of Object.entries(FRAMEWORK_MAP)) {
      if (deps[pkgName]) techs.push(name as string);
    }
    if (pkg.scripts?.test) techs.push("Testing");
    if (pkg.scripts?.build) techs.push("Build System");
    if (pkg.scripts?.lint) techs.push("Linting");
  } catch {}
  return techs;
}

function detectTechsFromRequirements(content: string): string[] {
  const techs: string[] = [];
  for (const [pkg, name] of Object.entries(PYTHON_LIBS)) {
    if (content.toLowerCase().includes(pkg)) techs.push(name);
  }
  return techs;
}

function detectTechsFromCargoToml(content: string): string[] {
  const techs: string[] = [];
  for (const [crate, name] of Object.entries(RUST_CRATES)) {
    if (content.includes(crate)) techs.push(name);
  }
  return techs;
}

function detectTechsFromGoMod(content: string): string[] {
  const techs: string[] = [];
  for (const [dep, name] of Object.entries(GO_LIBS)) {
    if (content.includes(dep)) techs.push(name);
  }
  return techs;
}

function generateInstallInstructions(language: string, repo: string, owner: string, scripts?: Record<string, string>): string {
  const lines: string[] = [];
  lines.push("### Clone & Install");
  lines.push("");
  lines.push("```bash");
  lines.push(`git clone https://github.com/${owner}/${repo}.git`);
  lines.push(`cd ${repo}`);
  lines.push("```");
  lines.push("");

  const langLower = language.toLowerCase();

  if (scripts) {
    if (scripts.dev || scripts.start || scripts.serve) {
      lines.push("### Development");
      lines.push("");
      lines.push("```bash");
      if (scripts.dev) lines.push("npm run dev");
      else if (scripts.start) lines.push("npm start");
      else if (scripts.serve) lines.push("npm run serve");
      lines.push("```");
      lines.push("");
    }
    if (scripts.build) {
      lines.push("### Build");
      lines.push("");
      lines.push("```bash");
      lines.push("npm run build");
      lines.push("```");
      lines.push("");
    }
    if (scripts.test) {
      lines.push("### Test");
      lines.push("");
      lines.push("```bash");
      lines.push("npm test");
      lines.push("```");
      lines.push("");
    }
    if (scripts.lint) {
      lines.push("### Lint");
      lines.push("");
      lines.push("```bash");
      lines.push("npm run lint");
      lines.push("```");
      lines.push("");
    }
  }

  if (langLower === "python") {
    lines.push("### Install Dependencies");
    lines.push("");
    lines.push("```bash");
    if (scripts?.install) {
      lines.push(scripts.install);
    } else {
      lines.push("pip install -r requirements.txt");
    }
    lines.push("```");
    lines.push("");
  } else if (langLower === "rust") {
    lines.push("### Build & Run");
    lines.push("");
    lines.push("```bash");
    lines.push("cargo build --release");
    lines.push("cargo run");
    lines.push("```");
    lines.push("");
  } else if (langLower === "go") {
    lines.push("### Build & Run");
    lines.push("");
    lines.push("```bash");
    lines.push("go build ./...");
    lines.push("go run .");
    lines.push("```");
    lines.push("");
  } else if (langLower === "java") {
    lines.push("### Build & Run");
    lines.push("");
    lines.push("```bash");
    lines.push("./gradlew build");
    lines.push("java -jar build/libs/*.jar");
    lines.push("```");
    lines.push("");
  } else if (langLower === "ruby") {
    lines.push("### Install & Run");
    lines.push("");
    lines.push("```bash");
    lines.push("bundle install");
    lines.push("bundle exec ruby main.rb");
    lines.push("```");
    lines.push("");
  }

  if (!scripts) {
    lines.push("### Install Dependencies");
    lines.push("");
    lines.push("```bash");
    if (langLower === "javascript" || langLower === "typescript") {
      lines.push("npm install");
    } else if (langLower === "python") {
      lines.push("pip install -r requirements.txt");
    } else if (langLower === "rust") {
      lines.push("cargo fetch");
    } else if (langLower === "go") {
      lines.push("go mod download");
    } else {
      lines.push("# Follow instructions in README");
    }
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

function generateMarkdownFromAnalysis(
  repoInfo: any,
  owner: string,
  repo: string,
  tree: TreeEntry[],
  readme: string | null,
  configFiles: FileContent[],
  sourceFiles: FileContent[],
  detectedTechs: string[],
  scripts?: Record<string, string>,
): string {
  const language = repoInfo.language || "Unknown";
  const lines: string[] = [];

  // ── Header ──────────────────────────────────────────────
  lines.push(`# ${repoInfo.full_name || `${owner}/${repo}`}`);
  lines.push("");
  if (repoInfo.description) {
    lines.push(`> ${repoInfo.description}`);
    lines.push("");
  }

  // ── Overview ────────────────────────────────────────────
  lines.push("## Overview");
  lines.push("");
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(`| **Repository** | [${repoInfo.full_name}](${repoInfo.html_url}) |`);
  lines.push(`| **Language** | ${language} |`);
  if (repoInfo.stargazers_count !== undefined)
    lines.push(`| **Stars** | ⭐ ${repoInfo.stargazers_count.toLocaleString()} |`);
  if (repoInfo.forks_count !== undefined)
    lines.push(`| **Forks** | 🍴 ${repoInfo.forks_count.toLocaleString()} |`);
  if (repoInfo.open_issues_count !== undefined)
    lines.push(`| **Open Issues** | ${repoInfo.open_issues_count} |`);
  if (repoInfo.license?.spdx_id && repoInfo.license.spdx_id !== "NOASSERTION")
    lines.push(`| **License** | ${repoInfo.license.spdx_id} |`);
  if (repoInfo.homepage)
    lines.push(`| **Homepage** | [${repoInfo.homepage}](${repoInfo.homepage}) |`);
  const createdAt = repoInfo.created_at ? new Date(repoInfo.created_at).toLocaleDateString() : "N/A";
  const updatedAt = repoInfo.updated_at ? new Date(repoInfo.updated_at).toLocaleDateString() : "N/A";
  lines.push(`| **Created** | ${createdAt} |`);
  lines.push(`| **Last Updated** | ${updatedAt} |`);
  lines.push("");

  // ── Topics ──────────────────────────────────────────────
  if (repoInfo.topics?.length > 0) {
    lines.push("## Topics");
    lines.push("");
    lines.push(repoInfo.topics.map((t: string) => `\`${t}\``).join(" "));
    lines.push("");
  }

  // ── README ──────────────────────────────────────────────
  if (readme) {
    lines.push("---");
    lines.push("");
    lines.push("## README");
    lines.push("");
    const readmeLines = readme.split("\n");
    if (readmeLines.length > 200) {
      lines.push(readmeLines.slice(0, 200).join("\n"));
      lines.push("");
      lines.push(`*... README truncated (${readmeLines.length} lines total, showing first 200) ...*`);
    } else {
      lines.push(readme);
    }
    lines.push("");
  }

  // ── Project Structure ───────────────────────────────────
  if (tree.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Project Structure");
    lines.push("");
    lines.push("```");
    lines.push(buildTreeVisualization(tree, 3));
    lines.push("```");
    lines.push("");
    lines.push(`*${tree.length} files total*`);
    lines.push("");
  }

  // ── Tech Stack ──────────────────────────────────────────
  if (detectedTechs.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Tech Stack");
    lines.push("");
    lines.push("Detected technologies used in this project:");
    lines.push("");
    detectedTechs.forEach((tech) => lines.push(`- **${tech}**`));
    lines.push("");
  }

  // ── Installation & Running ──────────────────────────────
  lines.push("---");
  lines.push("");
  lines.push("## Getting Started");
  lines.push("");
  lines.push(generateInstallInstructions(language, repo, owner, scripts));

  // ── Links ───────────────────────────────────────────────
  lines.push("---");
  lines.push("");
  lines.push("## Links");
  lines.push("");
  lines.push(`- **Repository:** [${repoInfo.full_name}](${repoInfo.html_url})`);
  if (repoInfo.owner?.html_url)
    lines.push(`- **Author:** [${owner}](${repoInfo.owner.html_url})`);
  if (repoInfo.homepage)
    lines.push(`- **Homepage:** [${repoInfo.homepage}](${repoInfo.homepage})`);
  lines.push("");

  // ── Footer ──────────────────────────────────────────────
  lines.push("---");
  lines.push("");
  lines.push(`*This markdown was automatically generated by reading the source code and files from [${repoInfo.full_name}](${repoInfo.html_url}).*`);

  return lines.join("\n");
}

export async function convertUrlToMarkdown(url: string): Promise<ConvertResult> {
  const github = parseGitHubUrl(url);
  if (github) {
    return convertGitHubRepo(url, github.owner, github.repo);
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; URL-to-Markdown/1.0)",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);

  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  const reader = new Readability(document);
  const article = reader.parse();

  if (!article || !article.content) {
    throw new Error("Could not extract content from this page");
  }

  const title = article.title || new URL(url).hostname;
  const content = article.content;

  let markdown = turndownService.turndown(content);

  markdown = `# ${title}\n\n> Source: [${url}](${url})\n\n---\n\n${markdown}\n\n---\n\n*Converted from [${new URL(url).hostname}](${url})*`;

  return { markdown, title, source: url };
}

async function convertGitHubRepo(
  url: string,
  owner: string,
  repo: string
): Promise<ConvertResult> {
  const repoInfo = await fetchJson<any>(
    `https://api.github.com/repos/${owner}/${repo}`
  );

  const branch = repoInfo.default_branch || "main";

  const tree = await fetchRepoTree(owner, repo, branch);

  const keyFilePaths: string[] = [];
  const configFilePaths: string[] = [];
  const sourceFilePaths: string[] = [];

  for (const entry of tree) {
    if (entry.type !== "blob") continue;
    if (shouldSkipFile(entry.path)) continue;

    const basename = entry.path.split("/").pop() || "";

    if (ALWAYS_READ.has(basename)) {
      keyFilePaths.push(entry.path);
    } else if (CONFIG_FILES.has(basename)) {
      configFilePaths.push(entry.path);
    } else if (isKeyFile(entry.path)) {
      sourceFilePaths.push(entry.path);
    }
  }

  const prioritized = [
    ...keyFilePaths,
    ...configFilePaths,
    ...sourceFilePaths,
  ].slice(0, 25);

  const fileContents = await Promise.all(
    prioritized.map(async (path): Promise<FileContent | null> => {
      const content = await fetchRaw(owner, repo, branch, path);
      if (!content) return null;
      if (content.includes("\0")) return null;
      return {
        path,
        content,
        language: getLangFromPath(path),
      };
    })
  );

  const validContents = fileContents.filter((f): f is FileContent => f !== null);

  const readmeContent = validContents.find((f) =>
    f.path.toLowerCase().endsWith("readme.md")
  );

  const configFiles = validContents.filter((f) => CONFIG_FILES.has(f.path.split("/").pop() || ""));
  const sourceFiles = validContents.filter((f) => !CONFIG_FILES.has(f.path.split("/").pop() || "") && !ALWAYS_READ.has(f.path.split("/").pop() || ""));

  const techStackSet = new Set<string>();

  for (const file of validContents) {
    if (file.language === "typescript" || file.language === "javascript") {
      const techs = detectTechsFromCode([file]);
      techs.forEach((t) => techStackSet.add(t));
    } else if (file.language === "python") {
      const techs = detectTechsFromCode([file]);
      techs.forEach((t) => techStackSet.add(t));
    } else if (file.language === "rust") {
      const techs = detectTechsFromCode([file]);
      techs.forEach((t) => techStackSet.add(t));
    } else if (file.language === "go") {
      const techs = detectTechsFromCode([file]);
      techs.forEach((t) => techStackSet.add(t));
    }
  }

  for (const file of configFiles) {
    const basename = file.path.split("/").pop() || "";
    if (basename === "package.json") {
      detectTechsFromPackageJson(file.content).forEach((t) => techStackSet.add(t));
    } else if (basename === "requirements.txt") {
      detectTechsFromRequirements(file.content).forEach((t) => techStackSet.add(t));
    } else if (basename === "Cargo.toml") {
      detectTechsFromCargoToml(file.content).forEach((t) => techStackSet.add(t));
    } else if (basename === "go.mod") {
      detectTechsFromGoMod(file.content).forEach((t) => techStackSet.add(t));
    }
  }

  if (repoInfo.language) techStackSet.add(repoInfo.language);

  const langCounts: Record<string, number> = {};
  for (const file of tree) {
    if (file.type === "blob" && !shouldSkipFile(file.path)) {
      const lang = getLangFromPath(file.path);
      if (lang !== "text" && lang !== "json" && lang !== "yaml" && lang !== "markdown") {
        langCounts[lang] = (langCounts[lang] || 0) + (file.size || 0);
      }
    }
  }
  const topLangs = Object.entries(langCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([lang]) => lang.charAt(0).toUpperCase() + lang.slice(1));
  topLangs.forEach((l) => techStackSet.add(l));

  let scripts: Record<string, string> | undefined;
  const pkgJson = configFiles.find((f) => f.path === "package.json");
  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson.content);
      scripts = pkg.scripts;
    } catch {}
  }

  const detectedTechs = [...techStackSet];

  const markdown = generateMarkdownFromAnalysis(
    repoInfo,
    owner,
    repo,
    tree,
    readmeContent?.content || null,
    configFiles,
    sourceFiles,
    detectedTechs,
    scripts
  );

  return {
    markdown,
    title: `${repoInfo.full_name || `${owner}/${repo}`} - Repository Analysis`,
    source: url,
  };
}

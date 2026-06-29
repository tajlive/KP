// Minimal bootstrap script: oppretter GitLab project vars, trigger pipeline, init Vercel project via CLI
// Kjør med: node scripts/bootstrap.js --gitlab-token $GITLAB_TOKEN --project-name klarpakke
const fetch = globalThis.fetch;
const { execSync } = require("child_process");
const args = require("minimist")(process.argv.slice(2));

async function createGitLabProject(token, name) {
  const res = await fetch("https://gitlab.com/api/v4/projects", {
    method: "POST",
    headers: { "Private-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      visibility: "private",
      initialize_with_readme: true,
    }),
  });
  return res.json();
}

async function setGitLabVariable(
  token,
  projectId,
  key,
  value,
  protectedVar = true,
  masked = true,
) {
  await fetch(`https://gitlab.com/api/v4/projects/${projectId}/variables`, {
    method: "POST",
    headers: { "Private-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({ key, value, protected: protectedVar, masked }),
  });
}

async function triggerPipeline(token, projectId, ref = "main") {
  await fetch(`https://gitlab.com/api/v4/projects/${projectId}/pipeline`, {
    method: "POST",
    headers: { "Private-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({ ref }),
  });
}

(async () => {
  const gitlabToken = args["gitlab-token"] || process.env.GITLAB_TOKEN;
  const projectName = args["project-name"] || "klarpakke";
  if (!gitlabToken) throw new Error("Missing GITLAB_TOKEN");

  const project = await createGitLabProject(gitlabToken, projectName);
  console.log("Created project", project.id);

  const vars = {
    VERCEL_TOKEN: process.env.VERCEL_TOKEN || "",
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || "",
    FIGMA_TOKEN: process.env.FIGMA_TOKEN || "",
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "",
    STRIPE_SECRET: process.env.STRIPE_SECRET || "",
    LAUNCHDARKLY_SDK_KEY: process.env.LAUNCHDARKLY_SDK_KEY || "",
  };

  for (const [k, v] of Object.entries(vars)) {
    if (v) {
      await setGitLabVariable(gitlabToken, project.id, k, v);
      console.log(`Set variable ${k}`);
    } else {
      console.log(`Skipping ${k} (no value)`);
    }
  }

  try {
    execSync("git remote add origin " + project.http_url_to_repo);
  } catch (e) {
    /* ignore if remote exists */
  }

  try {
    execSync("git push -u origin main", { stdio: "inherit" });
  } catch (e) {
    console.log(
      "Push failed, ensure local repo is initialized and has commits",
    );
  }

  await triggerPipeline(gitlabToken, project.id, "main");
  console.log("Bootstrap pipeline triggered");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

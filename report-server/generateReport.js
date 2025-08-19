// report-server/generateReport.js
const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');

const config = {
  projects: [
    { name: 'backend', path: 'D:/Github/evosist_parking-backend' },
    { name: 'frontend', path: 'D:/Github/evosist_parking-frontend' }
  ],
  reportPath: path.join(__dirname, '../logs'),
  authors: ['mohammad', 'evosist-bot'],
};

const getToday = () => new Date().toISOString().slice(0, 10);

const getCommits = async (repoPath) => {
  if (!fs.existsSync(repoPath)) {
    throw new Error(`❌ Repo path not found: ${repoPath}`);
  }

  const git = simpleGit(repoPath);
  const today = getToday();
  const log = await git.log({
    '--since': `${today}T00:00:00`,
    '--until': `${today}T23:59:59`,
    '--author': config.authors.join('|'),
  });

  return log.all.map(commit => ({
    hash: commit.hash,
    message: commit.message,
    date: commit.date,
    author: commit.author_name,
    link: `https://github.com/evosist/${path.basename(repoPath)}/commit/${commit.hash}`
  }));
};

const generateHTML = (commits) => {
  if (commits.length === 0) return `<p><i>Tidak ada commit hari ini.</i></p>`;

  return `<ul>\n${commits.map(c => `
    <li>
      <strong>${c.author}</strong> — ${c.message}<br>
      <a href="${c.link}" target="_blank">${c.hash.slice(0, 7)}</a> (${new Date(c.date).toLocaleTimeString()})
    </li>`).join('\n')}\n</ul>`;
};

const writeProjectReport = async (project, commits) => {
  const today = getToday();
  const html = generateHTML(commits);
  const filePath = path.join(config.reportPath, project.name, `${today}.html`);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, html);
};

const generateIndex = async () => {
  const today = getToday();
  const sections = [];

  for (const project of config.projects) {
    const filePath = path.join(config.reportPath, project.name, `${today}.html`);
    if (await fs.pathExists(filePath)) {
      const content = await fs.readFile(filePath, 'utf-8');
      sections.push(`<section><h2>${project.name.toUpperCase()}</h2>${content}</section>`);
    }
  }

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Laporan Gabungan ${today}</title>
    <style>
      body { font-family: sans-serif; padding: 2rem; }
      h1 { text-align: center; }
      section { margin-bottom: 2rem; }
      ul { line-height: 1.6; }
    </style>
  </head>
  <body>
    <h1>Laporan Commit Tim - ${today}</h1>
    ${sections.join('\n')}
  </body>
  </html>
  `;

  await fs.writeFile(path.join(__dirname, '../index.html'), html);
};

const commitAndPushReport = async () => {
  const reportGit = simpleGit(path.join(__dirname, '..'));
  await reportGit.add(['./logs/*', 'index.html']);
  await reportGit.commit(`Update report ${getToday()}`);
  await reportGit.push();
};

const main = async () => {
  for (const project of config.projects) {
    const commits = await getCommits(project.path);
    await writeProjectReport(project, commits);
  }

  await generateIndex();
  await commitAndPushReport();
};

main().catch(err => {
  console.error('❌ Error:', err.message);
});

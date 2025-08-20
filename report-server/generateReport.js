const simpleGit = require("simple-git");
const fs = require("fs-extra");
const path = require("path");
const readline = require("readline");

const config = {
  projects: [
    { name: "backend", path: "D:/Github/evosist_parking-backend" },
    { name: "frontend", path: "D:/Github/evosist_parking-frontend" },
  ],
  reportRepo: "D:/Github/evosist_parking-report",
  reportPath: "D:/Github/evosist_parking-report/logs",
  authors: ["Three Hartova", "Zen Zalepik", "Itmamul Fahmi", "evosist-bot"],
};

const getToday = () => new Date().toISOString().slice(0, 10);

const promptCommitMessage = () => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question("Masukkan judul commit: ", (msg) => {
      rl.close();
      resolve(msg.trim());
    });
  });
};

const getCommitsForDay = async (repoPath, dayStr) => {
  const git = simpleGit(repoPath);

  const logAll = await git.log({
    "--since": `${dayStr}T00:00:00`,
    "--until": `${dayStr}T23:59:59`,
  });

  return logAll.all.map((commit) => ({
    hash: commit.hash,
    message: commit.message,
    date: commit.date,
    author: commit.author_name,
    link: `https://github.com/evosist/${path.basename(repoPath)}/commit/${
      commit.hash
    }`,
  }));
};

const generateHTML = (commits) => {
  if (!commits || commits.length === 0)
    return `<p><i>Tidak ada commit hari ini.</i></p>`;
  return `<ul>\n${commits
    .map(
      (c) => `
    <li>
      <strong>${c.author}</strong>
      <div class="massage-commit">${c.message}</div>
      <div class="time-commit">(${new Date(c.date).toLocaleTimeString()})</div>
      <div class="link-commit">Buka link commit: <a href="${
        c.link
      }" target="_blank">${c.hash.slice(0, 7)}</a> </div>
    </li>`
    )
    .join("\n")}\n</ul>`;
};

const writeProjectReport = async (project, dayStr, commits) => {
  const html = generateHTML(commits);
  const filePath = path.join(config.reportPath, project.name, `${dayStr}.html`);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, html);
  console.log(`✅ Laporan ${project.name} (${dayStr}) berhasil ditulis`);
};

const pushProjectRepo = async (project, commitMessage) => {
  const git = simpleGit(project.path);
  console.log(`🚀 Push ke repo project: ${project.name}`);

  try {
    await git.fetch();
    await git.merge(["origin/main"]);
    await git.add(".");
    await git.commit(commitMessage);
    await git.push();
    console.log(`✅ Push ke ${project.name} berhasil`);
    return true;
  } catch (err) {
    console.log(`❌ Gagal push ke ${project.name}: ${err.message}`);
    return false;
  }
};

const generateIndex = async () => {
  console.log(`📦 Menggabungkan laporan 30 hari terakhir ke index.html`);
  const today = new Date();
  const sectionsByDay = {};

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);

    const sections = [];
    for (const project of config.projects) {
      const filePath = path.join(
        config.reportPath,
        project.name,
        `${dayStr}.html`
      );
      if (await fs.pathExists(filePath)) {
        const content = await fs.readFile(filePath, "utf-8");
        // sections.push(
        //   `<section><h1 class="text-3xl font-extrabold uppercase text-center">${project.name.toUpperCase()}</h1>${content}</section>`
        // );
        sections.push(`
  <section class="mb-4 border rounded shadow">
    <div class="flex justify-between items-center bg-gray-100 px-4 py-2 cursor-pointer"
         onclick="toggleSection('${project.name}-${dayStr}')">
      <h1 class="text-2xl font-bold uppercase">${project.name.toUpperCase()}</h1>
      <button class="text-xl font-bold" id="btn-${
        project.name
      }-${dayStr}">-</button>
    </div>
    <div id="${project.name}-${dayStr}" class="px-4 py-2">
      ${content}
    </div>
  </section>
`);
      } else {
        // sections.push(
        //   `<section><h1 class="text-3xl font-extrabold uppercase text-center">${project.name.toUpperCase()}</h1><p><i>Tidak ada commit hari ini.</i></p></section>`
        // );
        sections.push(`
  <section class="mb-4 border rounded shadow">
    <div class="flex justify-between items-center bg-gray-100 px-4 py-2 cursor-pointer"
         onclick="toggleSection('${project.name}-${dayStr}')">
      <h1 class="text-2xl font-bold uppercase">${project.name.toUpperCase()}</h1>
      <button class="text-xl font-bold" id="btn-${
        project.name
      }-${dayStr}">-</button>
    </div>
    <div id="${project.name}-${dayStr}" class="px-4 py-2">
      <p><i>Tidak ada commit hari ini.</i></p>
    </div>
  </section>
`);
      }
    }
    sectionsByDay[dayStr] = sections.join("\n");
  }

  const days = Object.keys(sectionsByDay).sort((a, b) => b.localeCompare(a));

  const tabs = days
    .map(
      (day, idx) =>
        `<button onclick="showDay('${day}')" class="${
          idx === 0 ? "active" : ""
        }">${day}</button>`
    )
    .join("\n");

  const contents = days
    .map(
      (day, idx) => `
    <div id="${day}" class="day-content ${idx === 0 ? "active" : ""}">
      <div class="flex selected-date">Tanggal: <h2 class="font-semibold ml-1 text-primary">${day}</h2></div>
      ${sectionsByDay[day]}
    </div>`
    )
    .join("\n");

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Laporan Gabungan 30 Hari</title>
    <!--<style>
      body { font-family: sans-serif; padding: 1rem; }
      h1 { text-align: center; }
      .tabs { display: flex; flex-wrap: wrap; margin-bottom: 1rem; }
      .tabs button {
        margin: 0.2rem;
        padding: 0.5rem 1rem;
        border: 1px solid #ccc;
        background: #f5f5f5;
        cursor: pointer;
      }
      .tabs button.active { background: #333; color: white; }
      .day-content { display: none; }
      .day-content.active { display: block; }
      section { margin-bottom: 1rem; }
    </style>-->
    <script src="https://cdn.tailwindcss.com/3.4.17"></script>
    <link rel="stylesheet" href="./style.css">
  </head>
  <body>
    <h1 class="text-3xl font-extrabold uppercase text-center">Laporan Commit Tim Evolusi Park</h1>
  <h2 class="text-xl font-semibold text-center mb-4">(30 Hari Terakhir)</h2>
    <div class="tabs">${tabs}</div>
    ${contents}
    <script>
      function showDay(day) {
        document.querySelectorAll('.day-content').forEach(d => d.classList.remove('active'));
        document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
        document.getElementById(day).classList.add('active');
        [...document.querySelectorAll('.tabs button')].find(b => b.textContent === day).classList.add('active');
      }
    </script>
    <script>
  function toggleSection(id) {
    const section = document.getElementById(id);
    const btn = document.getElementById("btn-" + id);

    if (section.classList.contains("hidden")) {
      section.classList.remove("hidden");
      btn.textContent = "−"; // ubah jadi minus saat terbuka
    } else {
      section.classList.add("hidden");
      btn.textContent = "+";
    }
  }
</script>
<script>
document.addEventListener("DOMContentLoaded", function () {
  function highlightText(text, colorClass) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.includes(text)) {
        nodes.push(walker.currentNode);
      }
    }
    nodes.forEach(node => {
      const span = document.createElement("span");
      span.className = colorClass;
      span.textContent = text;

      const parts = node.nodeValue.split(text);
      const frag = document.createDocumentFragment();

      parts.forEach((part, i) => {
        if (part) frag.appendChild(document.createTextNode(part));
        if (i < parts.length - 1) frag.appendChild(span.cloneNode(true));
      });

      node.parentNode.replaceChild(frag, node);
    });
  }

  // contoh pakai Tailwind (pastikan sudah include tailwind cdn v3.4.17)
  highlightText("Zen Zalepik", "text-blue-500 font-bold");
  highlightText("fahmiitmamul", "text-purple-500 font-bold");
});
</script>

  </body>
  </html>`;

  const indexPath = path.join(config.reportRepo, "index.html");
  await fs.writeFile(indexPath, html);
  console.log(`✅ index.html berhasil ditulis ke ${indexPath}`);
};

const pushReportRepo = async (commitMessage) => {
  const git = simpleGit(config.reportRepo);
  console.log(`🚀 Push ke repo pusat (reportRepo)`);

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      console.log("⛔ Folder reportRepo bukan repo Git aktif.");
      return false;
    }

    const remotes = await git.getRemotes(true);
    if (remotes.length === 0) {
      console.log("⛔ Tidak ada remote di repo pusat.");
      return false;
    }

    const branch = await git.branch();

    if (!branch.tracking || branch.tracking.length === 0) {
      await git.add(".");
      await git.commit(commitMessage);
      await git.push(["-u", "origin", branch.current]);
      console.log(`✅ Repo pusat berhasil di-push (tracking baru dibuat)`);
      return true;
    }

    const status = await git.status();
    if (status.files.length === 0) {
      console.log(`ℹ️ Tidak ada perubahan untuk di-commit di repo pusat`);
      return true;
    }

    await git.add(".");
    await git.commit(commitMessage);
    await git.push();
    console.log(`✅ Repo pusat berhasil di-push`);
    return true;
  } catch (err) {
    console.log(`❌ Gagal push ke repo pusat: ${err.message}`);
    return false;
  }
};

const main = async () => {
  console.log("🔧 Memulai proses generate laporan 30 hari...");
  const commitMessage = await promptCommitMessage();
  if (!commitMessage || commitMessage.length < 5) {
    console.log("❌ Judul commit terlalu pendek.");
    return;
  }

  let allSuccess = true;
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);

    for (const project of config.projects) {
      console.log(`📂 Memproses project: ${project.name} (${dayStr})`);
      const commits = await getCommitsForDay(project.path, dayStr);
      await writeProjectReport(project, dayStr, commits);
    }
  }

  for (const project of config.projects) {
    const success = await pushProjectRepo(project, commitMessage);
    if (!success) allSuccess = false;
  }

  if (allSuccess) {
    await generateIndex();
    const reportSuccess = await pushReportRepo(commitMessage);
    if (reportSuccess) {
      console.log(
        "✅ Semua proses selesai. Laporan 30 hari berhasil disimpan dan dipublikasikan."
      );
    } else {
      console.log("⛔ Push ke repo pusat gagal.");
    }
  } else {
    console.log("⛔ Push ke salah satu repo gagal.");
  }
};

main().catch((err) => console.error("❌ Error:", err.message));

const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const config = {
  projects: [
    { name: 'backend', path: 'D:/Github/evosist_parking-backend' },
    { name: 'frontend', path: 'D:/Github/evosist_parking-frontend' }
  ],
  // reportRepo: path.resolve(__dirname, '..'), // pastikan path absolut
  reportRepo: 'D:/Github/evosist_parking-report',
  // reportPath: path.resolve(__dirname, '../logs'),
  reportPath: 'D:/Github/evosist_parking-report/logs',
  authors: ['Three Hartova','Zen Zalepik', 'Itmamul Fahmi', 'evosist-bot'],
};

const getToday = () => new Date().toISOString().slice(0, 10);

const promptCommitMessage = () => {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Masukkan judul commit: ', msg => {
      rl.close();
      resolve(msg.trim());
    });
  });
};

const getCommits = async (repoPath) => {
  console.log(`📁 Mengecek commit di folder: ${repoPath}`);
  const git = simpleGit(repoPath);
  const today = getToday();

  const logAuthor = await git.log({
    '--since': `${today}T00:00:00`,
    '--until': `${today}T23:59:59`,
    '--author': config.authors.join('|'),
  });

  const logAll = await git.log({
    '--since': `${today}T00:00:00`,
    '--until': `${today}T23:59:59`,
  });

  const total = logAll.all.length;
  const dariTim = logAuthor.all.length;
  const dariRekan = total - dariTim;

  console.log(`📊 ${path.basename(repoPath)}: ${dariTim} commit dari tim inti`);
  console.log(`👥 ${path.basename(repoPath)}: ${dariRekan} commit dari rekan kerja lain`);
  if (total === 0) console.log(`ℹ️ Tidak ada commit hari ini di ${path.basename(repoPath)}`);

  return logAll.all.map(commit => ({
    hash: commit.hash,
    message: commit.message,
    date: commit.date,
    author: commit.author_name,
    link: `https://github.com/evosist/${path.basename(repoPath)}/commit/${commit.hash}`
  }));
};

const generateHTML = (commits) => {
  console.log(`🧾 Membuat HTML untuk ${commits.length} commit`);
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
  console.log(`📝 Menulis laporan ke: ${filePath}`);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, html);
  console.log(`✅ Laporan ${project.name} berhasil ditulis`);
};

const pushProjectRepo = async (project, commitMessage) => {
  const git = simpleGit(project.path);
  console.log(`🚀 Push ke repo project: ${project.name}`);

  try {
    await git.fetch();
    await git.merge(['origin/main']);
    await git.add('.');
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
  const today = getToday();
  console.log(`📦 Menggabungkan laporan ke index.html`);
  const sections = [];

  for (const project of config.projects) {
    const filePath = path.join(config.reportPath, project.name, `${today}.html`);
    if (await fs.pathExists(filePath)) {
      const content = await fs.readFile(filePath, 'utf-8');
      sections.push(`<section><h2>${project.name.toUpperCase()}</h2>${content}</section>`);
    } else {
      console.log(`⚠️ File laporan tidak ditemukan: ${filePath}`);
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

  const indexPath = path.join(config.reportRepo, 'index.html');
  await fs.writeFile(indexPath, html);
  console.log(`✅ index.html berhasil ditulis ke ${indexPath}`);
};

const pushReportRepo = async (commitMessage) => {
  const git = simpleGit(config.reportRepo);
  console.log(`🚀 Push ke repo pusat (reportRepo)`);

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      console.log('⛔ Folder reportRepo bukan repo Git aktif.');
      return false;
    }

    const remotes = await git.getRemotes(true);
    if (remotes.length === 0) {
      console.log('⛔ Tidak ada remote di repo pusat. Tambahkan dengan: git remote add origin <url>');
      return false;
    }

    const branch = await git.branch();

    // 🔧 perbaikan di sini
    if (!branch.tracking || branch.tracking.length === 0) {
      console.log(`⚠️ Branch ${branch.current} belum tracking remote. Push pertama kali dengan -u...`);
      await git.add('.');
      await git.commit(commitMessage);
      await git.push(['-u', 'origin', branch.current]);
      console.log(`✅ Repo pusat berhasil di-push (tracking baru dibuat)`);
      return true;
    }

    const status = await git.status();
    if (status.files.length === 0) {
      console.log(`ℹ️ Tidak ada perubahan untuk di-commit di repo pusat`);
      return true; // ✅ aku ubah return jadi true, supaya script tetap lanjut
    }

    await git.add('.');
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
  console.log('🔧 Memulai proses generate laporan harian...');
  const commitMessage = await promptCommitMessage();
  if (!commitMessage || commitMessage.length < 5) {
    console.log('❌ Judul commit terlalu pendek.');
    return;
  }

  let allSuccess = true;

  for (const project of config.projects) {
    console.log(`📂 Memproses project: ${project.name}`);
    const commits = await getCommits(project.path);
    await writeProjectReport(project, commits);
    const success = await pushProjectRepo(project, commitMessage);
    if (!success) allSuccess = false;
  }

  if (allSuccess) {
    await generateIndex();
    const reportSuccess = await pushReportRepo(commitMessage);
    if (reportSuccess) {
      console.log('✅ Semua proses selesai. Laporan harian berhasil disimpan dan dipublikasikan.');
    } else {
      console.log('⛔ Push ke repo pusat gagal. Laporan tidak dipublikasikan.');
    }
  } else {
    console.log('⛔ Push ke salah satu repo gagal. Laporan tidak dikirim ke repo pusat.');
  }
};

main().catch(err => {
  console.error('❌ Error:', err.message);
});

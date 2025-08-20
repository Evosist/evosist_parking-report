const simpleGit = require('simple-git');
const path = require('path');


const repoPath = 'D:/Github/evosist_parking-frontend';

(async () => {
  try {
    const git = simpleGit(repoPath);
    const log = await git.log({
      '--since': '2025-08-20T00:00:00',
      '--until': '2025-08-20T23:59:59'
    });

    console.log(`📋 Jumlah commit hari ini: ${log.total}`);
    log.all.forEach(c => {
      console.log(`- ${c.date} | ${c.author_name} | ${c.message}`);
    });
  } catch (err) {
    console.error('❌ Error membaca log:', err.message);
  }
})();

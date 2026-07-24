const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const dir = path.join(__dirname, 'prints');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Data e hora no fuso de Brasília
  const dataHoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD
  const horaHoje = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

  console.log(`[${dataHoje} ${horaHoje}] Iniciando captura do site ln1.com.br...`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Resolução Desktop Full HD
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  try {
    // Acessa o site
    await page.goto('https://ln1.com.br', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Rola levemente e aguarda 3 segundos para garantir carregamento de anúncios dinâmicos
    await page.evaluate(() => window.scrollBy(0, 100));
    await new Promise(resolve => setTimeout(resolve, 3000));

    const nomeArquivo = `print-${dataHoje}.png`;
    const caminhoCompleto = path.join(dir, nomeArquivo);

    // Tira o print do topo da página
    await page.screenshot({
      path: caminhoCompleto,
      fullPage: false
    });

    // Atualiza o histórico para o painel HTML
    const manifestPath = path.join(dir, 'manifest.json');
    let manifest = [];
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (e) {
        manifest = [];
      }
    }

    manifest = manifest.filter(item => item.date !== dataHoje);
    manifest.unshift({
      file: nomeArquivo,
      date: dataHoje,
      time: horaHoje
    });

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`Print e histórico salvos com sucesso: ${nomeArquivo}`);
  } catch (error) {
    console.error('Erro na captura:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
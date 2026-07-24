const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const dir = path.join(__dirname, 'prints');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Data e hora exatas no Fuso Horário de Brasília
  const dataHoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // Formato YYYY-MM-DD
  const dataFormatada = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); // Formato DD/MM/YYYY
  const horaHoje = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }); // Formato HH:MM:SS

  console.log(`[${dataFormatada} ${horaHoje}] Iniciando captura do site ln1.com.br...`);

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

    // INJETA O CARIMBO DIGITAL DE COMPROVAÇÃO FIXO NO TOPO
    await page.evaluate((dataStr, horaStr) => {
      const carimbo = document.createElement('div');
      carimbo.id = 'carimbo-comprovacao-midia';
      carimbo.innerHTML = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          background-color: #0f172a;
          color: #ffffff;
          padding: 12px 24px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 15px;
          font-weight: bold;
          z-index: 99999999;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          border-bottom: 4px solid #0284c7;
          box-sizing: border-box;
        ">
          <span style="display: flex; align-items: center; gap: 10px;">
            <span style="background: #0284c7; color: #ffffff; padding: 4px 10px; border-radius: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Comprovação de Mídia</span>
            <span>VEICULAÇÃO SITE: LN1.COM.BR</span>
          </span>
          <span style="color: #38bdf8; font-size: 16px;">
            📅 Data: <strong style="color: #ffffff;">${dataStr}</strong> &nbsp;|&nbsp; ⏰ Hora: <strong style="color: #ffffff;">${horaStr}</strong>
          </span>
        </div>
      `;
      document.body.prepend(carimbo);
    }, dataFormatada, horaHoje);

    // Rola a página 1100px para baixo para focar no banner horizontal central (seção Arapiraca)
    await page.evaluate(() => {
      window.scrollTo(0, 1100);
    });

    // Aguarda 4 segundos na posição final para garantir que o banner e imagens carreguem totalmente
    await new Promise(resolve => setTimeout(resolve, 4000));

    const nomeArquivo = `print-${dataHoje}.png`;
    const caminhoCompleto = path.join(dir, nomeArquivo);

    // Tira o print da área visível (com o carimbo fixado e o banner centralizado)
    await page.screenshot({
      path: caminhoCompleto,
      fullPage: false
    });

    // Atualiza o histórico do manifesto
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

    console.log(`Print com foco no banner central salvo com sucesso: ${nomeArquivo}`);
  } catch (error) {
    console.error('Erro na captura:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
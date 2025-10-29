import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

interface PreventivoData {
  id: string;
  nomeCliente: string;
  emailCliente?: string;
  telefonoCliente?: string;
  aziendaEmittente: string;
  logoAzienda?: string;
  nomeProdotto: string;
  descrizioneProdotto: string;
  caratteristiche: string[];
  funzionalita: string[];
  compatibilita: string[];
  vantaggi: string[];
  riconoscimenti: string[];
  prezzoOriginale: number;
  percentualeSconto: number;
  prezzoFinale: number;
  cosaRicevi: string[];
  passaggiAcquisto: string[];
  garanzie: string[];
  dataEmissione: Date;
  dataScadenza?: Date;
  noteAggiuntive?: string;
}

/**
 * Genera HTML per preventivo tradizionale professionale
 */
function generatePreventivoHTML(data: PreventivoData): string {
  const sconto = data.percentualeSconto > 0
    ? `<div class="sconto">SCONTO ${data.percentualeSconto}% APPLICATO</div>`
    : '';

  const dataScadenzaHTML = data.dataScadenza
    ? `<p class="scadenza">Offerta valida fino al ${new Date(data.dataScadenza).toLocaleDateString('it-IT')}</p>`
    : '';

  const logoHTML = data.logoAzienda
    ? `<img src="${data.logoAzienda}" alt="Logo" class="logo"/>`
    : '';

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preventivo - ${data.nomeProdotto}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: white;
    }

    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 10mm;
    }

    /* Header */
    .header {
      text-align: center;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .logo {
      max-width: 150px;
      max-height: 80px;
      margin-bottom: 15px;
    }

    .header h1 {
      font-size: 28px;
      color: #0066cc;
      margin-bottom: 5px;
    }

    .header .subtitle {
      font-size: 14px;
      color: #666;
    }

    .data-emissione {
      font-size: 12px;
      color: #999;
      margin-top: 10px;
    }

    /* Cliente Info */
    .cliente-info {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 25px;
    }

    .cliente-info h3 {
      font-size: 16px;
      color: #0066cc;
      margin-bottom: 10px;
    }

    .cliente-info p {
      font-size: 13px;
      margin: 3px 0;
    }

    /* Descrizione Prodotto */
    .descrizione-prodotto {
      margin-bottom: 30px;
    }

    .descrizione-prodotto h2 {
      font-size: 22px;
      color: #0066cc;
      margin-bottom: 15px;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 8px;
    }

    .descrizione-prodotto p {
      font-size: 14px;
      text-align: justify;
      line-height: 1.8;
      margin-bottom: 10px;
    }

    /* Box Caratteristiche */
    .section {
      margin-bottom: 25px;
    }

    .section h3 {
      font-size: 18px;
      color: #0066cc;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
    }

    .section h3::before {
      content: "▶";
      margin-right: 10px;
      font-size: 14px;
    }

    .caratteristiche-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 15px;
    }

    .caratteristica-box {
      background: #f9f9f9;
      padding: 12px;
      border-left: 4px solid #0066cc;
      font-size: 13px;
    }

    .caratteristica-box strong {
      color: #0066cc;
    }

    /* Tabella Funzionalità */
    .tabella-funzionalita {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .tabella-funzionalita th {
      background: #0066cc;
      color: white;
      padding: 12px;
      text-align: left;
      font-size: 14px;
    }

    .tabella-funzionalita td {
      padding: 10px 12px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 13px;
    }

    .tabella-funzionalita tr:nth-child(even) {
      background: #f9f9f9;
    }

    .check {
      color: #00cc66;
      font-weight: bold;
      font-size: 16px;
    }

    /* Lista */
    .lista {
      list-style: none;
      padding: 0;
    }

    .lista li {
      padding: 8px 0 8px 25px;
      position: relative;
      font-size: 13px;
      line-height: 1.5;
    }

    .lista li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #00cc66;
      font-weight: bold;
      font-size: 16px;
    }

    /* Prezzo */
    .prezzo-section {
      background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
      color: white;
      padding: 25px;
      border-radius: 8px;
      margin: 30px 0;
      text-align: center;
    }

    .prezzo-section h3 {
      font-size: 20px;
      margin-bottom: 15px;
    }

    .prezzo-originale {
      font-size: 16px;
      text-decoration: line-through;
      opacity: 0.8;
      margin-bottom: 5px;
    }

    .prezzo-finale {
      font-size: 42px;
      font-weight: bold;
      margin: 10px 0;
    }

    .sconto {
      display: inline-block;
      background: #ff6600;
      color: white;
      padding: 8px 20px;
      border-radius: 25px;
      font-weight: bold;
      font-size: 14px;
      margin-top: 10px;
    }

    .scadenza {
      margin-top: 15px;
      font-size: 13px;
      opacity: 0.9;
    }

    /* Procedura Acquisto */
    .procedura-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }

    .procedura-table td {
      padding: 12px;
      border: 1px solid #e0e0e0;
      font-size: 13px;
    }

    .procedura-table td:first-child {
      background: #0066cc;
      color: white;
      font-weight: bold;
      text-align: center;
      width: 80px;
    }

    /* CTA */
    .cta {
      background: #ff6600;
      color: white;
      padding: 18px 40px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      border-radius: 5px;
      margin: 30px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      font-size: 12px;
      color: #666;
    }

    .footer p {
      margin: 5px 0;
    }

    /* Note aggiuntive */
    .note {
      background: #fffacd;
      border-left: 4px solid #ffd700;
      padding: 15px;
      margin: 20px 0;
      font-size: 13px;
    }

    .note strong {
      color: #cc6600;
    }

    /* Print specific */
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .pagebreak {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      ${logoHTML}
      <h1>PREVENTIVO</h1>
      <div class="subtitle">${data.aziendaEmittente}</div>
      <div class="data-emissione">Data di emissione: ${new Date(data.dataEmissione).toLocaleDateString('it-IT')}</div>
    </div>

    <!-- Informazioni Cliente -->
    <div class="cliente-info">
      <h3>Cliente</h3>
      <p><strong>Nome:</strong> ${data.nomeCliente}</p>
      ${data.emailCliente ? `<p><strong>Email:</strong> ${data.emailCliente}</p>` : ''}
      ${data.telefonoCliente ? `<p><strong>Telefono:</strong> ${data.telefonoCliente}</p>` : ''}
    </div>

    <!-- Descrizione Prodotto -->
    <div class="descrizione-prodotto">
      <h2>${data.nomeProdotto}</h2>
      <p>${data.descrizioneProdotto}</p>
    </div>

    <!-- Compatibilità -->
    ${data.compatibilita.length > 0 ? `
    <div class="section">
      <h3>Compatibilità</h3>
      <p style="font-size: 13px; margin-bottom: 10px;">Questo prodotto è compatibile con:</p>
      <ul class="lista">
        ${data.compatibilita.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- Caratteristiche -->
    ${data.caratteristiche.length > 0 ? `
    <div class="section">
      <h3>Caratteristiche Principali</h3>
      <div class="caratteristiche-grid">
        ${data.caratteristiche.map(c => `<div class="caratteristica-box">${c}</div>`).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Tabella Funzionalità -->
    ${data.funzionalita.length > 0 ? `
    <div class="section">
      <h3>Funzionalità Complete</h3>
      <table class="tabella-funzionalita">
        <thead>
          <tr>
            <th>Funzionalità</th>
            <th style="width: 80px; text-align: center;">Incluso</th>
          </tr>
        </thead>
        <tbody>
          ${data.funzionalita.map(f => `
            <tr>
              <td>${f}</td>
              <td style="text-align: center;"><span class="check">✓</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Vantaggi -->
    ${data.vantaggi.length > 0 ? `
    <div class="section">
      <h3>Vantaggi Esclusivi</h3>
      <ul class="lista">
        ${data.vantaggi.map(v => `<li>${v}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- Riconoscimenti -->
    ${data.riconoscimenti.length > 0 ? `
    <div class="section">
      <h3>Riconoscimenti e Certificazioni</h3>
      <ul class="lista">
        ${data.riconoscimenti.map(r => `<li>${r}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- Sezione Prezzo -->
    <div class="prezzo-section">
      <h3>PREZZO ESCLUSIVO</h3>
      ${data.percentualeSconto > 0 ? `<div class="prezzo-originale">Prezzo listino: €${data.prezzoOriginale.toFixed(2)}</div>` : ''}
      <div class="prezzo-finale">€${data.prezzoFinale.toFixed(2)}</div>
      ${sconto}
      ${dataScadenzaHTML}
    </div>

    <!-- Cosa Ricevi -->
    ${data.cosaRicevi.length > 0 ? `
    <div class="section">
      <h3>Cosa Ricevi</h3>
      <ul class="lista">
        ${data.cosaRicevi.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- Procedura d'Acquisto -->
    ${data.passaggiAcquisto.length > 0 ? `
    <div class="section">
      <h3>Procedura d'Acquisto</h3>
      <table class="procedura-table">
        ${data.passaggiAcquisto.map((step, index) => `
          <tr>
            <td>Step ${index + 1}</td>
            <td>${step}</td>
          </tr>
        `).join('')}
      </table>
    </div>
    ` : ''}

    <!-- Garanzie -->
    ${data.garanzie.length > 0 ? `
    <div class="section">
      <h3>Garanzie e Supporto</h3>
      <ul class="lista">
        ${data.garanzie.map(g => `<li>${g}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- Note Aggiuntive -->
    ${data.noteAggiuntive ? `
    <div class="note">
      <strong>Note:</strong><br/>
      ${data.noteAggiuntive}
    </div>
    ` : ''}

    <!-- CTA Finale -->
    <div class="cta">
      Contattaci per Procedere con l'Ordine
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>${data.aziendaEmittente}</strong></p>
      <p>Preventivo generato automaticamente - ID: ${data.id}</p>
      <p>© ${new Date().getFullYear()} ${data.aziendaEmittente}. Tutti i diritti riservati.</p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Genera PDF da dati preventivo
 */
export async function generatePreventivoPDF(data: PreventivoData): Promise<string> {
  console.log('[preventivoPDF] Generazione PDF per preventivo:', data.id);

  const html = generatePreventivoHTML(data);

  // Crea directory uploads se non esiste
  const uploadsDir = path.join(__dirname, '../../uploads/preventivi');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const pdfPath = path.join(uploadsDir, `preventivo-${data.id}.pdf`);

  // Genera PDF con Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '10mm',
      right: '10mm',
      bottom: '10mm',
      left: '10mm'
    }
  });

  await browser.close();

  console.log('[preventivoPDF] PDF generato con successo:', pdfPath);

  // Restituisci URL relativo
  return `/uploads/preventivi/preventivo-${data.id}.pdf`;
}

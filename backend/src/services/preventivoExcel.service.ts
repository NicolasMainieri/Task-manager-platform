import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

interface PreventivoData {
  id: string;
  nomeCliente: string;
  emailCliente?: string;
  telefonoCliente?: string;
  aziendaEmittente: string;
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
 * Genera Excel con preventivo dettagliato
 */
export async function generatePreventivoExcel(data: PreventivoData): Promise<string> {
  console.log('[preventivoExcel] Generazione Excel per preventivo:', data.id);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = data.aziendaEmittente;
  workbook.created = new Date();

  // =======================================
  // FOGLIO 1: PREVENTIVO PRINCIPALE
  // =======================================
  const sheet1 = workbook.addWorksheet('Preventivo');
  sheet1.properties.defaultRowHeight = 20;

  // Stile header
  const headerStyle = {
    font: { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } } as ExcelJS.FillPattern,
    alignment: { vertical: 'middle', horizontal: 'center' } as ExcelJS.Alignment
  };

  const subHeaderStyle = {
    font: { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0066CC' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } } as ExcelJS.FillPattern,
    alignment: { vertical: 'middle', horizontal: 'left' } as ExcelJS.Alignment
  };

  const cellStyle = {
    font: { name: 'Arial', size: 11 },
    alignment: { vertical: 'top', horizontal: 'left', wrapText: true } as ExcelJS.Alignment
  };

  // Larghezze colonne
  sheet1.columns = [
    { width: 25 },
    { width: 60 }
  ];

  let row = 1;

  // Titolo
  sheet1.mergeCells(`A${row}:B${row}`);
  const titleCell = sheet1.getCell(`A${row}`);
  titleCell.value = `PREVENTIVO - ${data.aziendaEmittente}`;
  titleCell.style = {
    font: { name: 'Arial', size: 18, bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } } as ExcelJS.FillPattern,
    alignment: { vertical: 'middle', horizontal: 'center' } as ExcelJS.Alignment
  };
  sheet1.getRow(row).height = 30;
  row++;

  // Data emissione
  sheet1.mergeCells(`A${row}:B${row}`);
  sheet1.getCell(`A${row}`).value = `Data di emissione: ${new Date(data.dataEmissione).toLocaleDateString('it-IT')}`;
  sheet1.getCell(`A${row}`).style = {
    font: { name: 'Arial', size: 10, italic: true },
    alignment: { vertical: 'middle', horizontal: 'center' } as ExcelJS.Alignment
  };
  row += 2;

  // INFORMAZIONI CLIENTE
  sheet1.mergeCells(`A${row}:B${row}`);
  sheet1.getCell(`A${row}`).value = 'INFORMAZIONI CLIENTE';
  sheet1.getCell(`A${row}`).style = subHeaderStyle;
  row++;

  sheet1.getCell(`A${row}`).value = 'Nome/Azienda:';
  sheet1.getCell(`A${row}`).style = { font: { bold: true } };
  sheet1.getCell(`B${row}`).value = data.nomeCliente;
  sheet1.getCell(`B${row}`).style = cellStyle;
  row++;

  if (data.emailCliente) {
    sheet1.getCell(`A${row}`).value = 'Email:';
    sheet1.getCell(`A${row}`).style = { font: { bold: true } };
    sheet1.getCell(`B${row}`).value = data.emailCliente;
    sheet1.getCell(`B${row}`).style = cellStyle;
    row++;
  }

  if (data.telefonoCliente) {
    sheet1.getCell(`A${row}`).value = 'Telefono:';
    sheet1.getCell(`A${row}`).style = { font: { bold: true } };
    sheet1.getCell(`B${row}`).value = data.telefonoCliente;
    sheet1.getCell(`B${row}`).style = cellStyle;
    row++;
  }

  row++;

  // PRODOTTO
  sheet1.mergeCells(`A${row}:B${row}`);
  sheet1.getCell(`A${row}`).value = 'PRODOTTO/SERVIZIO';
  sheet1.getCell(`A${row}`).style = subHeaderStyle;
  row++;

  sheet1.mergeCells(`A${row}:B${row}`);
  sheet1.getCell(`A${row}`).value = data.nomeProdotto;
  sheet1.getCell(`A${row}`).style = {
    font: { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0066CC' } },
    alignment: { vertical: 'middle', horizontal: 'left' } as ExcelJS.Alignment
  };
  row++;

  sheet1.mergeCells(`A${row}:B${row}`);
  sheet1.getCell(`A${row}`).value = data.descrizioneProdotto;
  sheet1.getCell(`A${row}`).style = {
    ...cellStyle,
    alignment: { ...cellStyle.alignment, wrapText: true } as ExcelJS.Alignment
  };
  sheet1.getRow(row).height = 60;
  row += 2;

  // PREZZO
  sheet1.mergeCells(`A${row}:B${row}`);
  sheet1.getCell(`A${row}`).value = 'PREZZO';
  sheet1.getCell(`A${row}`).style = subHeaderStyle;
  row++;

  if (data.percentualeSconto > 0) {
    sheet1.getCell(`A${row}`).value = 'Prezzo Listino:';
    sheet1.getCell(`A${row}`).style = { font: { bold: true } };
    sheet1.getCell(`B${row}`).value = `€${data.prezzoOriginale.toFixed(2)}`;
    sheet1.getCell(`B${row}`).style = {
      font: { name: 'Arial', size: 11, color: { argb: 'FF999999' } },
      alignment: { vertical: 'middle', horizontal: 'right' } as ExcelJS.Alignment
    };
    row++;

    sheet1.getCell(`A${row}`).value = 'Sconto Applicato:';
    sheet1.getCell(`A${row}`).style = { font: { bold: true } };
    sheet1.getCell(`B${row}`).value = `${data.percentualeSconto}%`;
    sheet1.getCell(`B${row}`).style = {
      font: { name: 'Arial', size: 11, color: { argb: 'FFFF6600' }, bold: true },
      alignment: { vertical: 'middle', horizontal: 'right' } as ExcelJS.Alignment
    };
    row++;
  }

  sheet1.getCell(`A${row}`).value = 'PREZZO FINALE:';
  sheet1.getCell(`A${row}`).style = {
    font: { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0066CC' } }
  };
  sheet1.getCell(`B${row}`).value = `€${data.prezzoFinale.toFixed(2)}`;
  sheet1.getCell(`B${row}`).style = {
    font: { name: 'Arial', size: 16, bold: true, color: { argb: 'FF0066CC' } },
    alignment: { vertical: 'middle', horizontal: 'right' } as ExcelJS.Alignment
  };
  sheet1.getRow(row).height = 25;
  row += 2;

  if (data.dataScadenza) {
    sheet1.mergeCells(`A${row}:B${row}`);
    sheet1.getCell(`A${row}`).value = `Offerta valida fino al ${new Date(data.dataScadenza).toLocaleDateString('it-IT')}`;
    sheet1.getCell(`A${row}`).style = {
      font: { name: 'Arial', size: 10, italic: true, color: { argb: 'FFFF6600' } },
      alignment: { vertical: 'middle', horizontal: 'center' } as ExcelJS.Alignment
    };
    row += 2;
  }

  // =======================================
  // FOGLIO 2: DETTAGLI TECNICI
  // =======================================
  const sheet2 = workbook.addWorksheet('Dettagli Tecnici');
  sheet2.properties.defaultRowHeight = 20;
  sheet2.columns = [{ width: 80 }];

  let row2 = 1;

  // Caratteristiche
  if (data.caratteristiche.length > 0) {
    sheet2.getCell(`A${row2}`).value = 'CARATTERISTICHE PRINCIPALI';
    sheet2.getCell(`A${row2}`).style = subHeaderStyle;
    row2++;

    data.caratteristiche.forEach((car, index) => {
      sheet2.getCell(`A${row2}`).value = `✓ ${car}`;
      sheet2.getCell(`A${row2}`).style = cellStyle;
      row2++;
    });
    row2++;
  }

  // Funzionalità
  if (data.funzionalita.length > 0) {
    sheet2.getCell(`A${row2}`).value = 'FUNZIONALITÀ COMPLETE';
    sheet2.getCell(`A${row2}`).style = subHeaderStyle;
    row2++;

    data.funzionalita.forEach((fun, index) => {
      sheet2.getCell(`A${row2}`).value = `${index + 1}. ${fun}`;
      sheet2.getCell(`A${row2}`).style = cellStyle;
      row2++;
    });
    row2++;
  }

  // Compatibilità
  if (data.compatibilita.length > 0) {
    sheet2.getCell(`A${row2}`).value = 'COMPATIBILITÀ';
    sheet2.getCell(`A${row2}`).style = subHeaderStyle;
    row2++;

    data.compatibilita.forEach((comp, index) => {
      sheet2.getCell(`A${row2}`).value = `✓ ${comp}`;
      sheet2.getCell(`A${row2}`).style = cellStyle;
      row2++;
    });
    row2++;
  }

  // Vantaggi
  if (data.vantaggi.length > 0) {
    sheet2.getCell(`A${row2}`).value = 'VANTAGGI';
    sheet2.getCell(`A${row2}`).style = subHeaderStyle;
    row2++;

    data.vantaggi.forEach((van, index) => {
      sheet2.getCell(`A${row2}`).value = `✓ ${van}`;
      sheet2.getCell(`A${row2}`).style = cellStyle;
      row2++;
    });
    row2++;
  }

  // Riconoscimenti
  if (data.riconoscimenti.length > 0) {
    sheet2.getCell(`A${row2}`).value = 'RICONOSCIMENTI E CERTIFICAZIONI';
    sheet2.getCell(`A${row2}`).style = subHeaderStyle;
    row2++;

    data.riconoscimenti.forEach((ric, index) => {
      sheet2.getCell(`A${row2}`).value = `🏆 ${ric}`;
      sheet2.getCell(`A${row2}`).style = cellStyle;
      row2++;
    });
    row2++;
  }

  // =======================================
  // FOGLIO 3: COSA RICEVI
  // =======================================
  if (data.cosaRicevi.length > 0 || data.garanzie.length > 0 || data.passaggiAcquisto.length > 0) {
    const sheet3 = workbook.addWorksheet('Cosa Ricevi');
    sheet3.properties.defaultRowHeight = 20;
    sheet3.columns = [{ width: 80 }];

    let row3 = 1;

    // Cosa ricevi
    if (data.cosaRicevi.length > 0) {
      sheet3.getCell(`A${row3}`).value = 'COSA RICEVI';
      sheet3.getCell(`A${row3}`).style = subHeaderStyle;
      row3++;

      data.cosaRicevi.forEach((item, index) => {
        sheet3.getCell(`A${row3}`).value = `✓ ${item}`;
        sheet3.getCell(`A${row3}`).style = cellStyle;
        row3++;
      });
      row3++;
    }

    // Procedura acquisto
    if (data.passaggiAcquisto.length > 0) {
      sheet3.getCell(`A${row3}`).value = 'PROCEDURA D\'ACQUISTO';
      sheet3.getCell(`A${row3}`).style = subHeaderStyle;
      row3++;

      data.passaggiAcquisto.forEach((step, index) => {
        sheet3.getCell(`A${row3}`).value = `Step ${index + 1}: ${step}`;
        sheet3.getCell(`A${row3}`).style = cellStyle;
        row3++;
      });
      row3++;
    }

    // Garanzie
    if (data.garanzie.length > 0) {
      sheet3.getCell(`A${row3}`).value = 'GARANZIE E SUPPORTO';
      sheet3.getCell(`A${row3}`).style = subHeaderStyle;
      row3++;

      data.garanzie.forEach((gar, index) => {
        sheet3.getCell(`A${row3}`).value = `✓ ${gar}`;
        sheet3.getCell(`A${row3}`).style = cellStyle;
        row3++;
      });
      row3++;
    }
  }

  // Note aggiuntive (se presenti)
  if (data.noteAggiuntive) {
    row++;
    sheet1.mergeCells(`A${row}:B${row}`);
    sheet1.getCell(`A${row}`).value = 'NOTE AGGIUNTIVE';
    sheet1.getCell(`A${row}`).style = subHeaderStyle;
    row++;

    sheet1.mergeCells(`A${row}:B${row}`);
    sheet1.getCell(`A${row}`).value = data.noteAggiuntive;
    sheet1.getCell(`A${row}`).style = {
      ...cellStyle,
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFACD' } } as ExcelJS.FillPattern
    };
    sheet1.getRow(row).height = 40;
  }

  // Salva file
  const uploadsDir = path.join(__dirname, '../../uploads/preventivi');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const excelPath = path.join(uploadsDir, `preventivo-${data.id}.xlsx`);
  await workbook.xlsx.writeFile(excelPath);

  console.log('[preventivoExcel] Excel generato con successo:', excelPath);

  // Restituisci URL relativo
  return `/uploads/preventivi/preventivo-${data.id}.xlsx`;
}

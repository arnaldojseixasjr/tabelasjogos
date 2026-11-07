// ============================================================================
// Exportadores para PDF (jsPDF + autotable) e Excel/CSV (SheetJS / xlsx).
// Funcionam 100% no navegador, sem backend.
// ============================================================================

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { formatDateBR } from "./time-utils";
import { NAPE_LABEL, type EventDay, type Match, type ScheduleState } from "./types";

interface ExportInput {
  state: ScheduleState;
}

/** Agrupa os jogos por dia (preservando ordem) */
function groupByDay(matches: Match[], days: EventDay[]): Array<{ day: EventDay; matches: Match[] }> {
  return days.map((day) => ({
    day,
    matches: matches.filter((m) => m.dayId === day.id),
  }));
}

/** Monta as linhas de dados para a tabela de um dia */
function buildDayRows(matches: Match[]): (string | number)[][] {
  return matches.map((m, i) => [
    i + 1,
    `${m.startTime} - ${m.endTime}`,
    m.categoryName,
    NAPE_LABEL[m.naipe],
    m.modality,
    `${m.teamA}  x  ${m.teamB}`,
    m.restWarning ? `⚠ ${m.restGap} jogos` : "OK",
  ]);
}

// ---------------------------------------------------------------------------
// PDF — A4 paisagem
// ---------------------------------------------------------------------------

export function exportToPDF({ state }: ExportInput): void {
  const { config, days, matches } = state;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Cabeçalho
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerLines: string[] = [];
  if (config.institutionName) headerLines.push(config.institutionName);
  if (config.eventName) headerLines.push(config.eventName);
  headerLines.push("Grade de Jogos — Quadra Única");
  if (config.transitionMinutes != null) {
    headerLines.push(`Transição entre jogos: ${config.transitionMinutes} min`);
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  let y = 14;
  headerLines.slice(0, 2).forEach((line) => {
    doc.text(line, pageWidth / 2, y, { align: "center" });
    y += 6;
  });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  headerLines.slice(2).forEach((line) => {
    doc.text(line, pageWidth / 2, y, { align: "center" });
    y += 5;
  });

  const groups = groupByDay(matches, days);

  if (groups.length === 0 || matches.length === 0) {
    doc.text(
      "Nenhum jogo agendado. Configure o evento e clique em Gerar Tabela.",
      pageWidth / 2,
      y + 10,
      { align: "center" }
    );
    doc.save("grade-jogos.pdf");
    return;
  }

  let firstTable = true;
  for (const { day, matches: dayMatches } of groups) {
    if (dayMatches.length === 0) continue;

    if (!firstTable) {
      doc.addPage();
    }
    firstTable = false;

    // Subtítulo do dia
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const dayTitle = `${day.label}${day.date ? " — " + formatDateBR(day.date) : ""}`;
    doc.text(dayTitle, 14, 22);
    // Turnos
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const turnosStr = day.shifts
      .map((s) => `${s.name}: ${s.startTime}-${s.endTime}`)
      .join("  |  ");
    doc.text(`Turnos: ${turnosStr}`, 14, 27);

    autoTable(doc, {
      startY: 32,
      head: [
        ["#", "Horário", "Categoria", "Naipe", "Modalidade", "Confronto", "Descanso"],
      ],
      body: buildDayRows(dayMatches),
      theme: "grid",
      headStyles: {
        fillColor: [21, 94, 70], // emerald-800 (sóbrio)
        textColor: 255,
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 2,
      },
      alternateRowStyles: { fillColor: [244, 252, 247] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 28 },
        2: { cellWidth: 30 },
        3: { cellWidth: 24 },
        4: { cellWidth: 30 },
        5: { cellWidth: 50 },
        6: { cellWidth: 28, halign: "center" },
      },
      didParseCell: (data) => {
        // Destaca visualmente jogos com alerta de descanso
        if (data.section === "body" && data.column.index === 6) {
          const value = String(data.cell.text[0] ?? "");
          if (value.startsWith("⚠")) {
            data.cell.styles.textColor = [161, 51, 11]; // amber/orange
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.textColor = [22, 101, 52]; // emerald-700
          }
        }
      },
    });
  }

  // Rodapé com totalizadores
  const totalMatches = matches.length;
  const totalWarnings = matches.filter((m) => m.restWarning).length;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  const footer = `Total de jogos: ${totalMatches}  |  Alertas de descanso: ${totalWarnings}  |  Gerado em ${new Date().toLocaleString("pt-BR")}`;
  doc.text(footer, 14, doc.internal.pageSize.getHeight() - 8);

  doc.save("grade-jogos.pdf");
}

// ---------------------------------------------------------------------------
// Excel — uma planilha estruturada por dia + uma planilha resumo
// ---------------------------------------------------------------------------

export function exportToExcel({ state }: ExportInput): void {
  const { config, days, matches } = state;
  const wb = XLSX.utils.book_new();

  // Planilha de resumo
  const summaryData: (string | number)[][] = [
    ["Instituição", config.institutionName || "—"],
    ["Evento", config.eventName || "—"],
    ["Transição (min)", config.transitionMinutes],
    [""],
    ["Total de dias", days.length],
    ["Total de jogos", matches.length],
    ["Jogos com alerta de descanso", matches.filter((m) => m.restWarning).length],
    [""],
    ["Dias cadastrados"],
    ...days.map((d) => [
      `${d.label}${d.date ? " — " + formatDateBR(d.date) : ""}`,
      d.shifts.map((s) => `${s.name}: ${s.startTime}-${s.endTime}`).join(" | "),
    ]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");

  // Uma planilha por dia
  const groups = groupByDay(matches, days);
  for (const { day, matches: dayMatches } of groups) {
    const rows: (string | number)[][] = [
      [
        "#",
        "Horário Início",
        "Horário Fim",
        "Categoria",
        "Naipe",
        "Modalidade",
        "Equipe A",
        "Equipe B",
        "Descanso (jogos de intervalo)",
        "Alerta",
      ],
    ];
    dayMatches.forEach((m, i) => {
      rows.push([
        i + 1,
        m.startTime,
        m.endTime,
        m.categoryName,
        NAPE_LABEL[m.naipe],
        m.modality,
        m.teamA,
        m.teamB,
        Number.isFinite(m.restGap) ? m.restGap : "—",
        m.restWarning ? "SIM" : "Não",
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 10 },
    ];

    // Nome da aba limitado a 31 chars e sem caracteres inválidos
    const sheetName = (day.label || "Dia").replace(/[\\/?*[\]:]/g, "").slice(0, 28) || "Dia";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, "grade-jogos.xlsx");
}

// ---------------------------------------------------------------------------
// CSV estruturado (fallback) — uma única planilha, todas as linhas
// ---------------------------------------------------------------------------

export function exportToCSV({ state }: ExportInput): void {
  const { days, matches } = state;
  const header = [
    "Dia",
    "Data",
    "Turno",
    "#",
    "Horario Inicio",
    "Horario Fim",
    "Categoria",
    "Naipe",
    "Modalidade",
    "Equipe A",
    "Equipe B",
    "Descanso (jogos de intervalo)",
    "Alerta",
  ];

  const rows: string[][] = [header];
  for (const { day, matches: dayMatches } of groupByDay(matches, days)) {
    dayMatches.forEach((m, i) => {
      const shift = day.shifts.find((s) => s.id === m.shiftId);
      rows.push([
        day.label,
        day.date ? formatDateBR(day.date) : "",
        shift?.name ?? "",
        String(i + 1),
        m.startTime,
        m.endTime,
        m.categoryName,
        NAPE_LABEL[m.naipe],
        m.modality,
        m.teamA,
        m.teamB,
        Number.isFinite(m.restGap) ? String(m.restGap) : "—",
        m.restWarning ? "SIM" : "Nao",
      ]);
    });
  }

  const csv = rows
    .map((r) => r.map((cell) => escapeCsv(cell)).join(";"))
    .join("\n");

  // BOM para Excel reconhecer UTF-8
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "grade-jogos.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string): string {
  if (value == null) return "";
  const needsQuote = /[;"\r\n]/.test(value);
  const v = value.replace(/"/g, '""');
  return needsQuote ? `"${v}"` : v;
}

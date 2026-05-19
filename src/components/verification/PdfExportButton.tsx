import { jsPDF } from "jspdf";

type Props = {
  title: string;
  lines: string[];
};

export default function PdfExportButton({ title, lines }: Props) {
  function handleExport() {
    const pdf = new jsPDF();
    let y = 20;

    pdf.setFontSize(18);
    pdf.text(title, 15, y);
    y += 14;

    pdf.setFontSize(11);

    lines.forEach((line) => {
      const rows = pdf.splitTextToSize(line, 180);

      if (y + rows.length * 6 > 285) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(rows, 15, y);
      y += rows.length * 6 + 8;
    });

    pdf.save("verifica-tecnica.pdf");
  }

  return (
    <button
      onClick={handleExport}
      type="button"
      style={{
        border: "none",
        borderRadius: 12,
        padding: "10px 14px",
        cursor: "pointer",
        fontWeight: 800,
      }}
    >
      Scarica PDF
    </button>
  );
}

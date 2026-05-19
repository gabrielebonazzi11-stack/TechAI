import CalculationBox from "./CalculationBox";
import PdfExportButton from "./PdfExportButton";
import { parseVerificationReport } from "./VerificationReport";

type Props = {
  content: string;
  title?: string;
};

export default function VerificationReportView({ content, title = "Verifica Meccanica" }: Props) {
  const rows = parseVerificationReport(content);
  const calculations = rows.filter((row) => row.kind === "calculation");
  const notes = rows.filter((row) => row.kind === "note");

  return (
    <section>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <PdfExportButton title={title} lines={rows.map((row) => row.text)} />
      </header>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {calculations.map((row, index) => (
          <CalculationBox key={index} text={row.text} />
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        {notes.map((row, index) => (
          <p key={index} style={{ lineHeight: 1.55 }}>{row.text}</p>
        ))}
      </div>
    </section>
  );
}

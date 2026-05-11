import CalculationBox from "./CalculationBox";
import PdfExportButton from "./PdfExportButton";
import { parseVerificationReport } from "../../components/VerificationReport";

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
      <header>
        <h3>{title}</h3>
        <PdfExportButton title={title} lines={rows.map((row) => row.text)} />
      </header>

      <div>
        {calculations.map((row, index) => (
          <CalculationBox key={index} text={row.text} />
        ))}
      </div>

      <div>
        {notes.map((row, index) => (
          <p key={index}>{row.text}</p>
        ))}
      </div>
    </section>
  );
}

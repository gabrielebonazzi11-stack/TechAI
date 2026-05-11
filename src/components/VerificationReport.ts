export type VerificationReportLine = {
  kind: "calculation" | "note";
  text: string;
};

export function parseVerificationReport(content: string): VerificationReportLine[] {
  return String(content || "")
    .split("\n")
    .filter(Boolean)
    .map((text) => {
      const lower = text.toLowerCase();
      const isCalculation =
        text.includes("=") ||
        lower.includes("calcolo") ||
        lower.includes("verifica") ||
        lower.includes("mpa") ||
        lower.includes("goodman") ||
        lower.includes("soderberg");

      return {
        kind: isCalculation ? "calculation" : "note",
        text,
      };
    });
}

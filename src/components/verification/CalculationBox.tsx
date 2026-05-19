type Props = {
  text: string;
};

export default function CalculationBox({ text }: Props) {
  return (
    <div
      style={{
        border: "1px solid rgba(96,165,250,0.24)",
        borderRadius: 14,
        padding: 12,
        background: "rgba(96,165,250,0.06)",
        fontFamily: "monospace",
        whiteSpace: "pre-wrap",
        lineHeight: 1.65,
      }}
    >
      {text}
    </div>
  );
}

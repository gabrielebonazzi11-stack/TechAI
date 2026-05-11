type Props = {
  text: string;
};

export default function CalculationBox({ text }: Props) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        padding: 12,
        background: "rgba(255,255,255,0.03)",
        fontFamily: "monospace",
        whiteSpace: "pre-wrap",
        lineHeight: 1.65,
      }}
    >
      {text}
    </div>
  );
}

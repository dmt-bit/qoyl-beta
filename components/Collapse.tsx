export default function Collapse({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
        show ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="min-h-0">
        <div className="space-y-6 pt-4">{children}</div>
      </div>
    </div>
  );
}

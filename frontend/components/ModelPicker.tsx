"use client";

export default function ModelPicker({
  models,
  value,
  onChange,
  disabled,
}: {
  models: string[];
  value: string | null;
  onChange: (model: string) => void;
  disabled: boolean;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
    >
      <option value="" disabled>
        Select a model
      </option>
      {models.map((m) => (
        <option key={m} value={m} className="bg-sidebar">
          {m}
        </option>
      ))}
    </select>
  );
}

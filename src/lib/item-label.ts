export type FinishedProductSize =
  | "SMALL"
  | "ROUND"
  | "MEDIUM"
  | "LARGE";

const SIZE_LABELS: Record<FinishedProductSize, string> = {
  SMALL: "Small",
  ROUND: "Round",
  MEDIUM: "Medium",
  LARGE: "Large",
};

export function formatItemLabel(item: {
  name: string;
  size?: FinishedProductSize | string | null;
}) {
  if (!item.size) return item.name;

  const label =
    SIZE_LABELS[item.size as FinishedProductSize] ??
    item.size;

  return item.name + " — " + label;
}

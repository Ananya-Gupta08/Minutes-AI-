export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Preserve each stored avatar hue while keeping white initials readable.
export function avatarBackground(color: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return "#7957d5";
  let rgb = [1, 3, 5].map((offset) =>
    parseInt(color.slice(offset, offset + 2), 16),
  );
  const linear = (value: number) =>
    value / 255 <= 0.04045
      ? value / 255 / 12.92
      : ((value / 255 + 0.055) / 1.055) ** 2.4;
  while (
    1.05 /
      (0.2126 * linear(rgb[0]) +
        0.7152 * linear(rgb[1]) +
        0.0722 * linear(rgb[2]) +
        0.05) <
    4.6
  ) {
    rgb = rgb.map((value) => Math.floor(value * 0.95));
  }
  return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}
export const clockTime = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
};
export const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export const timeLabel = (date: string) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
export const toLocalInput = (date: string) => {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

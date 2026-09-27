import Image from "next/image";

type Props = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const configBySize = {
  sm: { box: "h-12 w-12", px: 48 },
  md: { box: "h-16 w-16", px: 64 },
  lg: { box: "h-20 w-20", px: 80 },
} as const;

export default function PurpleYamLogo({ size = "md", className = "" }: Props) {
  const config = configBySize[size];

  return (
    <div
      className={`mx-auto overflow-hidden rounded-full border border-purple-300/40 bg-purple-950/80 shadow-[0_0_30px_rgba(168,85,247,0.25)] ${config.box} ${className}`}
    >
      <Image
        src="/purple-yam-logo.jpg"
        alt="Purple Yam"
        width={config.px}
        height={config.px}
        priority
        className="h-full w-full object-cover"
      />
    </div>
  );
}

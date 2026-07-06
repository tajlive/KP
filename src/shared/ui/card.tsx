import * as React from "react";

import { cn } from "@/lib/utils";

type CardVariant = "default" | "glass";

type GlassCardVariant = "default" | "elevated" | "subtle" | "glow";

type CardHover = "none" | "lift" | "glow";

type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps extends React.ComponentProps<"div"> {
  variant?: CardVariant;
  glassVariant?: GlassCardVariant;
  hover?: CardHover;
  padding?: CardPadding;
}

const glassVariantClasses: Record<GlassCardVariant, string> = {
  default:
    "bg-kp-bg-card/80 backdrop-blur-glass border border-kp-border/80",
  elevated:
    "bg-kp-bg-card/90 backdrop-blur-glass border border-kp-border-strong shadow-kp-card",
  subtle:
    "bg-kp-bg-tertiary/80 border border-kp-border",
  glow:
    "bg-kp-bg-card/80 backdrop-blur-glass border border-kp-brand/20 shadow-kp-glow",
};

const hoverClasses: Record<CardHover, string> = {
  none: "",
  lift: "hover:-translate-y-0.5 hover:shadow-kp-card-hover transition-all duration-200",
  glow: "hover:border-kp-brand/30 hover:shadow-kp-glow transition-all duration-300",
};

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

function Card({
  className,
  variant = "default",
  glassVariant = "default",
  hover = "none",
  padding = "none",
  children,
  ...props
}: CardProps) {
  const isGlass = variant === "glass";

  return (
    <div
      data-slot="card"
      className={cn(
        "relative flex flex-col gap-6 rounded-card overflow-hidden",
        // Default card treatment
        !isGlass &&
          "bg-[var(--kp-bg-secondary)] text-[var(--kp-text-primary)] border border-[var(--kp-border)] py-6 shadow-sm",
        // Glass treatment
        isGlass && glassVariantClasses[glassVariant],
        hoverClasses[hover],
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {isGlass && (
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 50%)",
          }}
        />
      )}
      <div className="relative z-10 flex flex-col gap-6">
        {children}
      </div>
    </div>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-[var(--kp-text-secondary)] text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};

export type { CardProps };

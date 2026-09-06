import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import type { ThemeTokenName } from "@bull-board/api/typings/app";
import { HonoAdapter } from "@bull-board/hono";
import { ADMIN_ROUTES, STATIC_ROUTES } from "@eidolon/config";
import { COLORS, GEOMETRY, TYPOGRAPHY } from "@eidolon/tokens";
import type { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { allQueues } from "@/queue/queues";

const BOARD_LOGO_PX = 22;

function eidolonTheme(): Partial<Record<ThemeTokenName, string>> {
  return {
    background: COLORS.canvas,
    foreground: COLORS.textPrimary,
    card: COLORS.card,
    "card-foreground": COLORS.textPrimary,
    popover: COLORS.card,
    "popover-foreground": COLORS.textPrimary,
    primary: COLORS.accentAmber,
    "primary-foreground": COLORS.canvas,
    secondary: COLORS.inputSurface,
    "secondary-foreground": COLORS.textPrimary,
    muted: COLORS.audioPillBg,
    "muted-foreground": COLORS.textMuted,
    accent: COLORS.accentAmber,
    "accent-foreground": COLORS.canvas,
    "state-hover": COLORS.cardBorder,
    "state-selected": COLORS.accentAmberHover,
    "state-selected-hover": COLORS.accentAmber,
    "state-selected-foreground": COLORS.canvas,
    destructive: COLORS.danger,
    "destructive-foreground": COLORS.textPrimary,
    border: COLORS.cardBorder,
    input: COLORS.inputSurface,
    ring: COLORS.accentAmber,
    radius: `${GEOMETRY.cardRadius}px`,
    overlay: COLORS.canvas,
    "font-sans": `"${TYPOGRAPHY.fonts.sans}", system-ui, sans-serif`,
    "font-mono": `ui-monospace, ${TYPOGRAPHY.fonts.mono}`,
    sidebar: COLORS.audioPillBg,
    "sidebar-foreground": COLORS.textPrimary,
    "sidebar-primary": COLORS.accentAmber,
    "sidebar-primary-foreground": COLORS.canvas,
    "sidebar-accent": COLORS.cardBorder,
    "sidebar-accent-foreground": COLORS.textPrimary,
    "sidebar-state-hover": COLORS.cardBorder,
    "sidebar-state-selected": COLORS.accentAmberHover,
    "sidebar-state-selected-hover": COLORS.accentAmber,
    "sidebar-state-selected-foreground": COLORS.canvas,
  };
}

export function createQueueBoard(): Hono {
  const adapter = new HonoAdapter(serveStatic);

  createBullBoard({
    queues: allQueues.map((queue) => new BullMQAdapter(queue)),
    serverAdapter: adapter,
    options: {
      uiConfig: {
        boardTitle: "Eidolon",
        boardLogo: { path: STATIC_ROUTES.logo, width: BOARD_LOGO_PX, height: BOARD_LOGO_PX },
        favIcon: { default: STATIC_ROUTES.logo, alternative: STATIC_ROUTES.logo },
        hideDocsLink: true,
        theme: { dark: eidolonTheme(), light: eidolonTheme() },
      },
    },
  });

  adapter.setBasePath(ADMIN_ROUTES.queues);
  return adapter.registerPlugin();
}

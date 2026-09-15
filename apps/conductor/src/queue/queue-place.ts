import { QUEUE_JOBS } from "@eidolon/config";
import { QUEUE_ANNOUNCE } from "@/config";
import { gpuQueue } from "@/queue/queues";
import { broadcastToUser } from "@/ws/registry";

type Kind = "portrait" | "photo";

const KINDS: Record<string, Kind> = {
  [QUEUE_JOBS.generatePortrait]: "portrait",
  [QUEUE_JOBS.generatePersonaPortrait]: "portrait",
  [QUEUE_JOBS.generateChatPhoto]: "photo",
};

function announces(kind: Kind): boolean {
  return kind === "portrait" ? QUEUE_ANNOUNCE.portraits : QUEUE_ANNOUNCE.chatPhotos;
}

function userOf(data: unknown): string | null {
  const held = data as { userId?: unknown };
  return typeof held.userId === "string" && held.userId.length > 0 ? held.userId : null;
}

const told = new Set<string>();

export async function announceQueuePlaces(): Promise<void> {
  try {
    const [active, waiting] = await Promise.all([gpuQueue.getActive(), gpuQueue.getWaiting()]);
    const ordered = [...active, ...waiting];
    const total = ordered.length;

    const waitingNow = new Set<string>();

    for (const [index, job] of ordered.entries()) {
      const kind = KINDS[job.name];
      const user = userOf(job.data);

      if (!kind || !user || !announces(kind) || waitingNow.has(user)) continue;

      waitingNow.add(user);
      broadcastToUser(user, {
        type: "queue_place",
        payload: { kind, position: index + 1, total },
      });
    }

    for (const user of told) {
      if (waitingNow.has(user)) continue;
      broadcastToUser(user, {
        type: "queue_place",
        payload: { kind: "portrait", position: 0, total: 0 },
      });
    }

    told.clear();
    for (const user of waitingNow) told.add(user);
  } catch (error) {
    console.error("[queue] could not work out who is where in the queue", error);
  }
}

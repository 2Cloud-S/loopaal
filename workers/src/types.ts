import type { Campaign, MemoryItem, Prospect } from "../../src/types.ts";

export interface WorkerInput {
  campaign: Campaign;
  prospects: Prospect[];
  memory: MemoryItem[];
  channel?: "gmail" | "whatsapp";
}

export interface WorkerResult {
  workerId: string;
  status: "complete" | "failed";
  summary: string;
  artifacts: Record<string, unknown>;
  audit?: string[];
}

export interface LoopaalWorker {
  workerId: string;
  description: string;
  run(input: WorkerInput): Promise<WorkerResult>;
}

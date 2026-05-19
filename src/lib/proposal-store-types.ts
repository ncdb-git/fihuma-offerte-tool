import { Proposal } from "@/lib/types";

export type UpsertSource = "webhook" | "advisor" | "pdf" | "upload";

export type UpsertStorageResult =
  | {
      mode: "supabase";
      action: "insert" | "update";
      recordId: string;
      pipedriveDealId: string;
      status: string;
    }
  | {
      mode: "file";
      action: "insert" | "update";
      recordId: string;
      pipedriveDealId: string;
      status: string;
      filePath: string;
    };

export type UpsertProposalResult = {
  proposal: Proposal;
  created: boolean;
  storage: UpsertStorageResult;
};

export type ProposalRecord = {
  proposal: Proposal;
  createdAt: string;
  updatedAt: string;
};

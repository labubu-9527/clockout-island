export type PetState = "idle" | "notice" | "agentAttention" | "agentWorking" | "focused" | "music";

export interface PetActivity {
  notice: boolean;
  agentAttention: boolean;
  agentWorking: boolean;
  focusing: boolean;
  musicPlaying: boolean;
}

export function resolvePetState(activity: PetActivity): PetState {
  if (activity.notice) return "notice";
  if (activity.agentAttention) return "agentAttention";
  if (activity.musicPlaying) return "music";
  if (activity.agentWorking) return "agentWorking";
  if (activity.focusing) return "focused";
  return "idle";
}

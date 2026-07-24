import type { Tool } from "../api";

export interface RunnerProps {
  tool: Tool;
  onSuccess: () => void;
}

import type { Infra } from "../infra/index.ts";
import {
  createSessionDetectionService,
  type SessionDetectionService,
} from "./session-detection-service.ts";
import { createWeztermService, type WeztermService } from "./wezterm-service.ts";

export type ServiceContext = {
  infra: Infra;
};

export type Services = {
  wezterm: WeztermService;
  sessionDetection: SessionDetectionService;
};

export const createServices = (context: ServiceContext): Services => ({
  wezterm: createWeztermService(context),
  sessionDetection: createSessionDetectionService(),
});

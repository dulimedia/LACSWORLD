import mitt from 'mitt';

export type ScopeType = 'building' | 'floor' | 'unit';
export interface Scope { 
  buildingId?: string; 
  floorNum?: number; 
  unitId?: string | null;
}

export interface AppError {
  code: string;
  message: string;
  cause?: unknown;
}

export interface Ok<T> {
  ok: true;
  data: T;
}

export interface Fail {
  ok: false;
  error: AppError;
}

export type Result<T> = Ok<T> | Fail;

// Event type definitions according to INTERACTION_CONTRACT.md
export type Events = {
  // Lifecycle
  'evt.viewer.init': { ts: string };
  'evt.viewer.ready': { ts: string, assets: { env: string; overlays: string } };
  'evt.viewer.error': { ts: string, error: AppError };

  // Inventory & Availability
  'evt.inventory.updated': { ts: string, updatedAt: string, rows: number };
  'evt.availability.toggled': { ts: string, on: boolean };

  // Scope, Highlight, Camera
  'evt.highlight.changed': { ts: string, scope: ScopeType, ids: string[] };
  'evt.scope.framed': { ts: string, scope: ScopeType, id: string };
  'evt.camera.reset': { ts: string };

  // UI & Navigation
  'evt.ui.drawer.opened': { ts: string, source?: 'button' | 'deeplink' };
  'evt.ui.drawer.closed': { ts: string };
  'evt.ui.floorplan.opened': { ts: string, kind: 'unit' | 'floor', id: string, png: string, pdf?: string };

  // Selection & Requests
  'evt.selection.changed': { ts: string, selected: string[] };
  'evt.request.opened': { ts: string, selected: string[] };
  'evt.request.submitted': { ts: string, unit_ids: string[], scope?: Scope };
  'evt.request.succeeded': { ts: string, requestId: string };
  'evt.request.failed': { ts: string, error: AppError };

  // Deep Links & Share
  'evt.deeplink.applied': { ts: string, params: Record<string, string>, valid: boolean };
  'evt.share.copied': { ts: string, url: string, mode: 'scope' | 'selection' };
};

// Create the event emitter
export const events = mitt<Events>();

// Helper function to get current timestamp in ISO format
export const getTimestamp = (): string => new Date().toISOString();

// Helper to emit events both internally and as DOM CustomEvents
export const emitEvent = <K extends keyof Events>(eventName: K, payload: Events[K]): void => {
  // Emit internally via mitt
  events.emit(eventName, payload);
  
  // Also emit as DOM CustomEvent for external integrations
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  }
};

// Command interface types (for implementing the cmd.* functions later)
export namespace CMD {
  export type LoadScene = (canvas: HTMLCanvasElement) => Promise<Result<{ sceneId: string }>>;
  export type ResetView = () => Promise<Result<void>>;
  export type FrameScope = (scope: Scope) => Promise<Result<void>>;
  export type Highlight = (params: { type: ScopeType; id: string }) => Promise<Result<void>>;
  export type RefreshInventory = () => Promise<Result<{ updatedAt: string }>>;
  export type SetAvailability = (on: boolean) => Promise<Result<{ on: boolean }>>;
  export type SelectUnits = (ids: string[], on?: boolean) => Promise<Result<{ selected: string[] }>>;
  export type ClearSelection = () => Promise<Result<void>>;
  export type OpenRequest = () => Promise<Result<{ selected: string[] }>>;
  export type SubmitRequest = (params: { unit_ids: string[]; scope?: Scope; utm?: Record<string, string> }) => Promise<Result<{ requestId: string }>>;
  export type ApplyDeepLink = (params: URLSearchParams) => Promise<Result<{ applied: boolean }>>;
  export type CopyShareUrl = (mode: 'scope' | 'selection') => Promise<Result<{ url: string }>>;
  export type OpenExplore = () => Promise<Result<void>>;
  export type CloseExplore = () => Promise<Result<void>>;
  export type ShowFloorPlan = (png: string, pdf?: string) => Promise<Result<void>>;
}

// Query interface types (for implementing the qry.* functions later)
export namespace QRY {
  export type GetScope = () => Scope;
  export type GetSelection = () => string[];
  export type GetAvailability = () => boolean;
  export type GetInventory = () => any; // This should be typed as per the actual inventory structure
  export type GetShareUrl = (mode?: 'scope' | 'selection') => string;
}
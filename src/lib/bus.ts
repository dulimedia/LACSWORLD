/** Spec reference:
 * See ./docs/AGENT_SPEC.md (§10 Acceptance) and ./docs/INTERACTION_CONTRACT.md (§3-4).
 * Do not change ids/schema without updating docs.
 */
import mitt from 'mitt';
type Events = Record<string, any>;
export const bus = mitt<Events>();
export function emit(name: string, detail: any) {
  bus.emit(name, detail);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
}
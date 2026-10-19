// Probe: load the CC0 cow, list its clips, show it lit on a plain floor.
import type { Project } from '../../src/core/plate';
const project: Project = { title: 'cow probe', bpm: 90, duration: 8, timeline: () => [{ id: 'p', plate: () => import('./plate').then((m) => ({ default: m.Probe })), start: 0, end: 4 }, { id: 'f', plate: () => import('./fonts').then((m) => ({ default: m.Fonts })), start: 4, end: 8 }] };
export default project;

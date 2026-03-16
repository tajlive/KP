/**
 * Re-export zustand with an explicit default (create) so that any code
 * using "import create from 'zustand'" gets create without triggering
 * zustand's built-in deprecation warning. Import from subpaths to avoid
 * circular resolution when webpack aliases 'zustand' to this file.
 */
export { create, useStore } from 'zustand/react';
export { createStore } from 'zustand/vanilla';
export type { StoreApi } from 'zustand/vanilla';
export type { UseBoundStore } from 'zustand/react';
import { create } from 'zustand/react';
export default create;

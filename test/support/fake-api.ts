// A stand-in Safelight API for unit tests, over real React and zustand. It has
// only what this extension uses: reading any other member throws, naming it,
// so a test shows what to add here when the extension starts using more.
//
// The develop store is a real zustand store holding the photo's param bag,
// with setDynParams and commitEdit, so the panel and the overlay re-render
// when it changes. Core's Slider is a stub that keeps the props it was last
// drawn with, so a test can drive a drag and its release. The canvas mapping
// is a plain rectangle (no crop or rotation): source UV (u, v) sits at
// (x + u·w, y + v·h).

import * as React from "react";
import { create } from "zustand";
import type {
  ButtonProps,
  DevelopOverlayState,
  Mask,
  PanelContribution,
  ParamScope,
  ProcessingStageContribution,
  SafelightAPI,
  SegmentedControlProps,
  SliderProps,
  SlotContribution,
  StylesheetContribution,
  ToggleProps,
} from "../../src/safelight";
import { EXT_ID } from "../../src/params";

export interface FakeDevelop {
  photoId: string | null;
  paramBag: Record<string, unknown>;
  params: { masks: Mask[] };
  setDynParams(patch: Record<string, unknown>): void;
  setParam(key: "masks", value: Mask[]): void;
  commitEdit(label: string): Promise<void>;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Rig {
  api: SafelightAPI;
  panels: PanelContribution[];
  stages: ProcessingStageContribution[];
  slots: SlotContribution[];
  stylesheets: StylesheetContribution[];
  unregistered: string[];
  /** The photo's param bag, without defaults. */
  params(): Readonly<Record<string, unknown>>;
  /** Undo steps, in order. */
  commits: string[];
  /** Every setViewValues call, in order. */
  viewValues: (Record<string, unknown> | null)[];
  sliders(root: ParentNode): SliderProps[];
  /** Replaces the bag from outside, as an undo or a preset would. */
  replace(bag: Record<string, unknown>): void;
  /** The photo's masks, and a way to replace them from outside. */
  masks(): readonly Mask[];
  setMasks(masks: Mask[]): void;
  /** Binds its children's useParamScope to mask `maskId`, as the Masking
   *  panel's sub-panels are bound. */
  MaskScope(props: { maskId: string; children?: React.ReactNode }): React.ReactElement;
  /** Presses Escape as core's key hook does: the newest taker of
   *  api.ui.onEscape gets it. Whether anyone took it. */
  escape(): boolean;
  /** Lays out the canvas with the image at `rect` (null: not yet). */
  setImageRect(rect: Rect | null, imageAspect?: number): void;
}

export function fakeApi(initial: Record<string, unknown> = {}): Rig {
  const panels: PanelContribution[] = [];
  const stages: ProcessingStageContribution[] = [];
  const slots: SlotContribution[] = [];
  const stylesheets: StylesheetContribution[] = [];
  const unregistered: string[] = [];
  const commits: string[] = [];
  const viewValues: (Record<string, unknown> | null)[] = [];
  const sliderProps = new Map<number, SliderProps>();
  let nextSlider = 0;

  const develop = create<FakeDevelop>()((set) => ({
    photoId: "photo-1",
    paramBag: { ...initial },
    params: { masks: [] },
    setDynParams: (patch) => set((s) => ({ paramBag: { ...s.paramBag, ...patch } })),
    setParam: (_key, masks) => set((s) => ({ params: { ...s.params, masks } })),
    commitEdit: async (label) => void commits.push(label),
  }));

  // Core's scope: the photo's bag outside a mask sub-panel, the mask's inside.
  const MaskContext = React.createContext<string | null>(null);
  function useParamScope(): ParamScope {
    const maskId = React.useContext(MaskContext);
    develop((s) => (maskId === null ? s.paramBag : s.params.masks));
    const bagOf = (): Record<string, unknown> =>
      maskId === null
        ? develop.getState().paramBag
        : (develop.getState().params.masks.find((m) => m.id === maskId)?.bag ?? {});
    return {
      maskId,
      getParam: (k) => bagOf()[k],
      getParams: bagOf,
      setParams: (patch) => {
        if (maskId === null) {
          develop.getState().setDynParams(patch);
          return;
        }
        const masks = develop.getState().params.masks.map((m) => {
          if (m.id !== maskId) return m;
          const bag = { ...m.bag };
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined) delete bag[k];
            else bag[k] = v;
          }
          return { ...m, bag };
        });
        develop.getState().setParam("masks", masks);
      },
      commit: (label) => void commits.push(label),
    };
  }
  function MaskScope({ maskId, children }: { maskId: string; children?: React.ReactNode }) {
    return React.createElement(MaskContext.Provider, { value: maskId }, children);
  }

  const layout = create<{ rect: Rect | null; aspect: number; nonce: number }>()(() => ({ rect: null, aspect: 1.5, nonce: 0 }));

  function useDevelopOverlay(): DevelopOverlayState {
    const { rect, aspect, nonce } = layout();
    if (!rect) {
      return {
        rect: null,
        imageRect: null,
        nonce,
        toScreen: null,
        toImage: null,
        radiusToScreen: null,
        radiusToImage: null,
        region: null,
        imageAspect: aspect,
      };
    }
    return {
      rect,
      imageRect: rect,
      nonce,
      toScreen: (u, v) => ({ x: rect.x + u * rect.w, y: rect.y + v * rect.h }),
      toImage: (x, y) => ({ x: (x - rect.x) / rect.w, y: (y - rect.y) / rect.h }),
      radiusToScreen: (r) => r * rect.h,
      radiusToImage: (px) => px / rect.h,
      region: { x: 0, y: 0, width: 1, height: 1 },
      imageAspect: aspect,
    };
  }

  function Slider(props: SliderProps) {
    const id = React.useRef(nextSlider++).current;
    sliderProps.set(id, props);
    return React.createElement("div", { "data-slider": id }, `${props.label} ${props.value}`);
  }

  const escapeTakers: (() => void)[] = [];
  const e = React.createElement;
  const tokens = new Proxy({}, { get: (_t, k) => `var(--${String(k)})` });
  const ui = {
    SegmentedControl: (props: SegmentedControlProps) =>
      e(
        "div",
        { role: "tablist" },
        ...props.options.map((o) =>
          e("button", { key: o.value, role: "tab", "aria-selected": o.value === props.value, onClick: () => props.onChange(o.value) }, o.label),
        ),
      ),
    Toggle: (props: ToggleProps) =>
      e(
        "label",
        null,
        props.label,
        e("input", { type: "checkbox", checked: props.checked, onChange: (ev: React.ChangeEvent<HTMLInputElement>) => props.onChange(ev.target.checked) }),
      ),
    Button: ({ active, variant: _variant, size: _size, full: _full, ...rest }: ButtonProps) =>
      e("button", { type: "button", "aria-pressed": active === true, ...rest }),
    onEscape: (handler: () => void) => {
      escapeTakers.push(handler);
      return () => {
        const i = escapeTakers.lastIndexOf(handler);
        if (i >= 0) escapeTakers.splice(i, 1);
      };
    },
    tokens,
  };

  const members = {
    version: 1,
    extensionId: EXT_ID,
    react: React,
    registerPanel: (c: PanelContribution) => void panels.push(c),
    registerProcessingStage: (c: ProcessingStageContribution) => void stages.push(c),
    unregisterProcessingStage: (id: string) => void unregistered.push(id),
    registerSlot: (c: SlotContribution) => void slots.push(c),
    registerStylesheet: (c: StylesheetContribution) => void stylesheets.push(c),
    components: { Slider },
    cursors: { resolve: (token: string) => token },
    develop: {
      useDevelopOverlay,
      useParamScope,
      setViewValues: (values: Record<string, unknown> | null) => void viewValues.push(values),
    },
    ui,
    stores: { create, useDevelopStore: develop },
  };

  return {
    // The fake implements only what the extension reads; the strict proxy
    // throws, naming the member, on anything else.
    api: strict(members, "api") as unknown as SafelightAPI,
    panels,
    stages,
    slots,
    stylesheets,
    unregistered,
    params: () => develop.getState().paramBag,
    commits,
    viewValues,
    replace: (bag) => develop.setState({ paramBag: { ...bag } }),
    masks: () => develop.getState().params.masks,
    setMasks: (masks) => develop.setState({ params: { masks } }),
    MaskScope,
    escape: () => {
      const top = escapeTakers.at(-1);
      top?.();
      return top !== undefined;
    },
    setImageRect: (rect, aspect = 1.5) => layout.setState((s) => ({ rect, aspect, nonce: s.nonce + 1 })),
    sliders: (root) =>
      [...root.querySelectorAll("[data-slider]")].map((el) => {
        const props = sliderProps.get(Number(el.getAttribute("data-slider")));
        if (!props) throw new Error("a slider without props");
        return props;
      }),
  };
}

/** Wraps a plain object so reading a member it lacks throws, naming the member. */
function strict<T extends object>(target: T, path: string): T {
  return new Proxy(target, {
    get(obj, key, receiver) {
      if (typeof key === "symbol" || key === "then" || key === "toJSON") return Reflect.get(obj, key, receiver);
      if (!(key in obj)) throw new Error(`The fake API has no ${path}.${key}. Add it to test/support/fake-api.ts.`);
      const value: unknown = Reflect.get(obj, key, receiver);
      const isPlainObject = typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
      return isPlainObject && key !== "react" && key !== "tokens" ? strict(value, `${path}.${key}`) : value;
    },
  });
}

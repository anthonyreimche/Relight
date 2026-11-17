var e = 2048, t = {
	min: -.5,
	max: 1.5
}, n = [
	1 / 16,
	4 / 16,
	6 / 16,
	4 / 16,
	1 / 16
], r = [
	-1 / 8,
	-2 / 8,
	0,
	2 / 8,
	1 / 8
], i = {
	ambient: 100,
	detail: 50,
	depth: 50,
	invert: !1,
	lights: []
}, a = {
	height: 40,
	falloff: 50,
	intensity: 80,
	hue: 35,
	saturation: 0
}, o = {
	ambient: {
		min: 0,
		max: 100,
		step: 1
	},
	detail: {
		min: 0,
		max: 100,
		step: 1
	},
	depth: {
		min: 0,
		max: 100,
		step: 1
	},
	height: {
		min: 0,
		max: 100,
		step: 1
	},
	falloff: {
		min: 0,
		max: 100,
		step: 1
	},
	intensity: {
		min: 0,
		max: 200,
		step: 1
	},
	hue: {
		min: 0,
		max: 360,
		step: 1
	},
	saturation: {
		min: 0,
		max: 100,
		step: 1
	}
};
function s(e) {
	return e.lights.slice(0, 4).filter((e) => e.intensity > 0);
}
function c(e) {
	return s(e).length > 0;
}
function l(e) {
	return e.ambient !== 100 || c(e);
}
function u(e) {
	return .03 * 2 ** (7 * (1 - e / 100));
}
var d = (e) => e <= .0031308 ? 12.92 * e : 1.055 * e ** (1 / 2.4) - .055;
function f(e, t) {
	let n = e / 60, r = t / 100, i = (e) => {
		let t = Math.min(Math.max(Math.abs(((n + e) % 6 + 6) % 6 - 3) - 1, 0), 1);
		return 1 - r + r * t;
	};
	return [
		i(0),
		i(4),
		i(2)
	];
}
function p(e) {
	let t = e / 100, n = [
		1 + .3 * t,
		1,
		Math.max(1 - .45 * t, 0)
	], r = Math.max(...n), [i, a, o] = n.map((e) => d(e / r)), s = Math.max(i, a, o), c = s - Math.min(i, a, o);
	return c <= 0 ? {
		hue: 0,
		saturation: 0
	} : {
		hue: ((i === s ? (a - o) / c : a === s ? 2 + (o - i) / c : 4 + (i - a) / c) * 60 % 360 + 360) % 360,
		saturation: 100 * c / s
	};
}
//#endregion
//#region src/params.ts
var m = "relight", h = `${m}.light`, g = `${m}.view`, _ = `${m}.panel`, v = `${m}.overlay`, y = [
	"on",
	"lit",
	"ambient",
	"detail",
	"depth",
	"invert",
	"lightCount",
	"levels",
	"shade"
], ee = ["lightPlace", "lightTone"], b = (e) => `${h}.${e}`, x = (e) => `${g}.${e}`, S = (e) => typeof e == "number" && Number.isFinite(e);
function C(e, t, n, r) {
	let i = e[b(t)];
	return S(i) ? Math.min(Math.max(i, n.min), n.max) : r;
}
var w = (e, t) => Math.min(Math.max(e, t.min), t.max), te = {
	min: -100,
	max: 100
};
function ne(e) {
	let n = e[b("lightPlace")], r = e[b("lightTone")], i = C(e, "lightCount", {
		min: 0,
		max: 4
	}, 0);
	if (!Array.isArray(n) || !Array.isArray(r) || n.length !== 16 || r.length !== 16) return [];
	let a = [];
	for (let e = 0; e < Math.floor(i); e++) {
		let i = [...n.slice(e * 4, e * 4 + 4), ...r.slice(e * 4, e * 4 + 4)].filter(S);
		if (i.length !== 8) continue;
		let [s, c, l, u, d, f, m, h] = i, g = f === 0 ? {
			hue: m,
			saturation: h
		} : p(w(f, te));
		a.push({
			u: w(s, t),
			v: w(c, t),
			height: w(l, o.height),
			falloff: w(u, o.falloff),
			intensity: w(d, o.intensity),
			hue: w(g.hue, o.hue),
			saturation: w(g.saturation, o.saturation)
		});
	}
	return a;
}
function T(e) {
	return {
		ambient: C(e, "ambient", o.ambient, i.ambient),
		detail: C(e, "detail", o.detail, i.detail),
		depth: C(e, "depth", o.depth, i.depth),
		invert: C(e, "invert", {
			min: 0,
			max: 1
		}, 0) > .5,
		lights: ne(e)
	};
}
function re(e) {
	let t = Array(16).fill(0), n = Array(16).fill(0);
	return e.slice(0, 4).forEach((e, r) => {
		t.splice(r * 4, 4, e.u, e.v, e.height, e.falloff), n.splice(r * 4, 4, e.intensity, 0, e.hue, e.saturation);
	}), {
		place: t,
		tone: n
	};
}
function E(e) {
	let t = e.lights.slice(0, 4), { place: n, tone: r } = re(t), i = c(e);
	return {
		[b("on")]: +!!l(e),
		[b("lit")]: +!!i,
		[b("ambient")]: e.ambient,
		[b("detail")]: e.detail,
		[b("depth")]: e.depth,
		[b("invert")]: +!!e.invert,
		[b("lightCount")]: t.length,
		[b("lightPlace")]: n,
		[b("lightTone")]: r,
		[b("levels")]: i ? 9 : 0,
		[b("shade")]: +!!i
	};
}
function ie() {
	return [...y, ...ee].map(b);
}
var D = [
	"on",
	"lit",
	"levels",
	"shade"
], O = [
	"ambient",
	"detail",
	"depth",
	"invert",
	"lightCount",
	"lightPlace",
	"lightTone"
];
function ae(e) {
	if (!O.some((t) => b(t) in e)) return null;
	let t = E(T(e));
	if (!D.some((n) => {
		let r = e[b(n)];
		return (S(r) ? r : 0) !== t[b(n)];
	})) return null;
	let n = {};
	for (let e of D) n[b(e)] = t[b(e)];
	return n;
}
function k(e, t) {
	return {
		...e,
		depth: t.depth,
		detail: t.detail,
		invert: t.invert
	};
}
var oe = [
	"depth",
	"detail",
	"invert"
];
function se(e, t) {
	let n = T(t), r = E(n), i = !1, a = e.map((e) => {
		let t = e.bag;
		return !t || !O.some((e) => b(e) in t) || oe.every((e) => t[b(e)] === r[b(e)]) ? e : (i = !0, {
			...e,
			bag: {
				...t,
				...E(k(T(t), n))
			}
		});
	});
	return i ? a : null;
}
function ce(e, t) {
	return e === 0 ? null : {
		[x("view")]: e,
		[x("detail")]: t.detail,
		[x("depth")]: t.depth,
		[x("invert")]: +!!t.invert,
		[x("levels")]: 9,
		[x("shade")]: 1,
		[b("on")]: 0,
		[b("levels")]: 0,
		[b("shade")]: 0
	};
}
//#endregion
//#region src/rt.ts
var A, j;
function le(e) {
	j = e, A = e.react;
}
//#endregion
//#region src/store.ts
var M = null;
function ue() {
	M = j.stores.create()((e) => ({
		selected: -1,
		view: 0,
		panels: 0,
		placing: !1,
		scope: null,
		spawn: null,
		select: (t) => e(t >= 0 ? {
			selected: t,
			placing: !0
		} : { selected: t }),
		place: (t) => e(t ? { placing: t } : {
			placing: t,
			selected: -1
		}),
		setView: (t) => e({ view: t }),
		panelShown: (t) => e((e) => {
			let n = Math.max(0, e.panels + (t ? 1 : -1));
			return n === 0 ? {
				panels: n,
				view: 0,
				placing: !1,
				selected: -1
			} : { panels: n };
		}),
		editScope: (t) => e({
			scope: t,
			selected: -1
		}),
		leaveMask: (t) => e((e) => e.scope?.maskId === t ? {
			scope: null,
			selected: -1
		} : {}),
		setSpawn: (t) => e({ spawn: t })
	}));
}
function N() {
	if (!M) throw Error("Relight's store is used before activate()");
	return M;
}
//#endregion
//#region src/edit.ts
var P = () => T(j.stores.useDevelopStore.getState().paramBag), F = {
	read: P,
	write: (e) => {
		let t = j.stores.useDevelopStore.getState(), n = P(), r = E(e);
		if (t.setDynParams(r), n.depth === e.depth && n.detail === e.detail && n.invert === e.invert) return;
		let i = se(t.params.masks, r);
		i && t.setParam("masks", i);
	},
	commit: (e) => void j.stores.useDevelopStore.getState().commitEdit(`Relight ${e}`)
};
function I(e) {
	return {
		read: () => k(T(e.getParams()), P()),
		write: (t) => e.setParams(E(k(t, P()))),
		commit: (t) => e.commit(`Relight ${t}`)
	};
}
function de() {
	let e = N().getState().scope;
	return e ? I(e) : F;
}
var L = (e) => Math.min(Math.max(e, t.min), t.max);
function fe(e, t, n) {
	let r = e.read();
	return r.lights.length >= 4 ? -1 : (e.write({
		...r,
		lights: [...r.lights, {
			u: L(t),
			v: L(n),
			...a
		}]
	}), e.commit("add light"), r.lights.length);
}
function R(e, t) {
	let n = e.read();
	t < 0 || t >= n.lights.length || (e.write({
		...n,
		lights: n.lights.filter((e, n) => n !== t)
	}), e.commit("remove light"));
}
function z(e, t, n) {
	let r = e.read(), i = r.lights[t];
	if (!i) return;
	let a = {
		...i,
		...n
	};
	a.u = L(a.u), a.v = L(a.v), e.write({
		...r,
		lights: r.lights.map((e, n) => n === t ? a : e)
	});
}
function B(e, t) {
	e.write({
		...e.read(),
		...t
	});
}
//#endregion
//#region src/mapping.ts
function pe(e) {
	let { rect: t, toScreen: n, toImage: r, radiusToScreen: i, imageAspect: a } = e;
	return !t || !n || !r || !i ? null : {
		rect: t,
		toScreen: n,
		toImage: r,
		radiusToScreen: i,
		imageAspect: a
	};
}
function me(e, t, n) {
	let r = n.getBoundingClientRect(), i = n.offsetWidth > 0 && r.width > 0 ? r.width / n.offsetWidth : 1;
	return {
		x: (e - r.left) / i,
		y: (t - r.top) / i
	};
}
function he(e, t) {
	return e * Math.max(t, 1);
}
//#endregion
//#region src/styles.ts
var V = "safelight-relight", ge = "relight.styles", H = {
	panel: `${V}-panel`,
	create: `${V}-create`,
	head: `${V}-head`,
	caption: `${V}-caption`,
	hint: `${V}-hint`,
	list: `${V}-list`,
	row: `${V}-row`,
	on: `${V}-on`,
	swatch: `${V}-swatch`,
	name: `${V}-name`,
	remove: `${V}-remove`,
	reveal: `${V}-reveal`,
	editor: `${V}-editor`
};
function U({ hue: e, saturation: t }) {
	let [n, r, i] = f(e, t).map((e) => Math.round(255 * e));
	return `rgb(${n}, ${r}, ${i})`;
}
var _e = `linear-gradient(to right, ${[
	0,
	60,
	120,
	180,
	240,
	300,
	360
].map((e) => U({
	hue: e,
	saturation: 100
})).join(", ")})`;
function ve(e) {
	return `linear-gradient(to right, ${U({
		hue: e,
		saturation: 0
	})}, ${U({
		hue: e,
		saturation: 100
	})})`;
}
var ye = (e, t) => `color-mix(in srgb, ${e} ${t}%, transparent)`;
function be(e) {
	return `
:where(.${H.panel} > :not(:last-child)) { margin-block: 0 0.5rem; }
:where(.${H.create}) { display: flex; width: 100%; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.25rem; background-color: ${e.surface2}; padding: 0.375rem 0.5rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${H.create}:hover) { color: ${e.textPrimary}; }
:where(.${H.create}:disabled) { cursor: default; opacity: 0.4; }
:where(.${H.head}) { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
:where(.${H.caption}) { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: ${e.textMuted}; }
:where(.${H.hint}) { font-size: 10px; line-height: 1.4; color: ${e.textMuted}; }
:where(.${H.list} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${H.row}) { display: flex; cursor: pointer; align-items: center; gap: 0.375rem; border-radius: 0.25rem; padding: 0.25rem 0.375rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${H.row}:hover) { background-color: ${e.surface2}; }
:where(.${H.row}.${H.on}) { background-color: ${ye(e.accent, 20)}; color: ${e.textPrimary}; }
:where(.${H.swatch}) { height: 0.625rem; width: 0.625rem; flex-shrink: 0; border-radius: 9999px; border: 1px solid ${e.borderSubtle}; }
:where(.${H.name}) { flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.${H.remove}) { border-radius: 0.25rem; padding: 0 0.25rem; color: ${e.textMuted}; }
:where(.${H.remove}:hover) { color: ${e.labelRed}; }
:where(.${H.reveal}) { opacity: 0; }
:where(.${H.row}:hover .${H.reveal}) { opacity: 1; }
:where(.${H.editor}) { border-top: 1px solid ${e.borderSubtle}; padding-top: 0.5rem; }
:where(.${H.editor} > :not(:last-child)) { margin-block: 0 0.375rem; }
html.sl-larger-text .${H.hint}, html.sl-larger-text .${H.caption} { font-size: 12px !important; }
html.sl-larger-text .${H.create}, html.sl-larger-text .${H.row} { font-size: 13px !important; line-height: 1.45 !important; }
html.sl-larger-text .${H.caption} { text-transform: none !important; letter-spacing: normal !important; }
`;
}
//#endregion
//#region src/Overlay.tsx
var W = 16;
function xe() {
	let e = j.develop.useDevelopOverlay(), t = pe(e);
	j.stores.useDevelopStore((e) => e.paramBag), j.stores.useDevelopStore((e) => e.params.masks), N()((e) => e.scope);
	let n = j.stores.useDevelopStore((e) => e.photoId), r = N()((e) => e.panels), i = N()((e) => e.placing) && r > 0, a = N()((e) => e.selected), o = A.useRef(null), s = A.useRef(null);
	A.useEffect(() => {
		let e = t;
		if (!e) return;
		let n = e.toImage(e.rect.x + e.rect.w / 3, e.rect.y + e.rect.h / 3);
		N().getState().setSpawn({
			u: n.x,
			v: n.y
		});
	}, [
		e.nonce,
		t?.rect.x,
		t?.rect.y,
		t?.rect.w,
		t?.rect.h
	]), A.useEffect(() => {
		s.current = null;
	}, [n]), A.useEffect(() => i ? j.ui.onEscape(() => N().getState().place(!1)) : void 0, [i]);
	let c = de(), l = c.read().lights;
	if (!t || !i || !n || l.length === 0) return null;
	let d = t, f = (e) => o.current ? me(e.clientX, e.clientY, o.current) : null, p = (e) => (t) => {
		if (t.button !== 0) return;
		let n = f(t);
		if (!n) return;
		t.preventDefault(), t.stopPropagation(), t.currentTarget.setPointerCapture(t.pointerId), t.currentTarget.focus(), N().getState().select(e);
		let r = d.toScreen(l[e].u, l[e].v);
		s.current = {
			index: e,
			pointerId: t.pointerId,
			grab: {
				x: n.x - r.x,
				y: n.y - r.y
			},
			moved: !1
		};
	}, m = (e) => {
		let t = s.current;
		if (!t || t.pointerId !== e.pointerId) return;
		let n = f(e);
		if (!n) return;
		let r = d.toImage(n.x - t.grab.x, n.y - t.grab.y);
		t.moved = !0, z(c, t.index, {
			u: r.x,
			v: r.y
		});
	}, h = (e) => {
		let t = s.current;
		t && t.pointerId === e.pointerId && (s.current = null, e.currentTarget.hasPointerCapture(e.pointerId) && e.currentTarget.releasePointerCapture(e.pointerId), t.moved && c.commit("move light"));
	}, g = (e) => (t) => {
		(t.key === "Delete" || t.key === "Backspace") && (t.preventDefault(), t.stopPropagation(), R(c, e), N().getState().select(-1));
	}, _ = a >= 0 && a < l.length ? l[a] : null, v = _ ? {
		at: d.toScreen(_.u, _.v),
		r: d.radiusToScreen(he(u(_.falloff), d.imageAspect))
	} : null, y = j.cursors.resolve("crop-move");
	return /* @__PURE__ */ A.createElement("div", {
		ref: o,
		style: {
			position: "absolute",
			inset: 0,
			overflow: "hidden",
			pointerEvents: "none"
		}
	}, v ? /* @__PURE__ */ A.createElement("div", {
		"data-relight-ring": "",
		style: {
			position: "absolute",
			left: v.at.x - v.r,
			top: v.at.y - v.r,
			width: v.r * 2,
			height: v.r * 2,
			borderRadius: "50%",
			border: "1px dashed rgba(255,255,255,0.7)",
			boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
			pointerEvents: "none"
		}
	}) : null, l.map((e, t) => {
		let n = d.toScreen(e.u, e.v), r = t === a;
		return /* @__PURE__ */ A.createElement("button", {
			key: t,
			type: "button",
			"data-relight-light": t,
			"aria-label": `Light ${t + 1}`,
			title: `Light ${t + 1}: drag to move, Delete to remove`,
			onPointerDown: p(t),
			onPointerMove: m,
			onPointerUp: h,
			onPointerCancel: h,
			onKeyDown: g(t),
			style: {
				position: "absolute",
				left: n.x - W / 2,
				top: n.y - W / 2,
				width: W,
				height: W,
				padding: 0,
				borderRadius: "50%",
				background: U(e),
				border: r ? "2px solid var(--color-accent)" : "2px solid rgba(255,255,255,0.9)",
				boxShadow: "0 0 0 1px rgba(0,0,0,0.6), 0 1px 4px rgba(0,0,0,0.5)",
				opacity: e.intensity > 0 ? 1 : .5,
				cursor: y,
				pointerEvents: "auto",
				touchAction: "none"
			}
		});
	}));
}
//#endregion
//#region src/Panel.tsx
var Se = [
	{
		value: "0",
		label: "Photo",
		title: "Show the photo"
	},
	{
		value: "1",
		label: "Normals",
		title: "Show the surface's normal map: which way each point faces"
	},
	{
		value: "2",
		label: "Height",
		title: "Show the surface's height map: lighter is nearer"
	}
], Ce = (e) => e === "1" ? 1 : e === "2" ? 2 : 0, we = [{
	key: "depth",
	label: "Depth",
	range: o.depth,
	defaultValue: 50,
	read: (e) => e.depth
}, {
	key: "detail",
	label: "Detail",
	range: o.detail,
	defaultValue: 50,
	read: (e) => e.detail
}], Te = [
	{
		key: "intensity",
		label: "Intensity",
		range: o.intensity,
		defaultValue: 80,
		read: (e) => e.intensity
	},
	{
		key: "height",
		label: "Height",
		range: o.height,
		defaultValue: 40,
		read: (e) => e.height
	},
	{
		key: "falloff",
		label: "Falloff",
		range: o.falloff,
		defaultValue: 50,
		read: (e) => e.falloff
	},
	{
		key: "hue",
		label: "Hue",
		range: o.hue,
		defaultValue: a.hue,
		read: (e) => e.hue,
		track: () => _e
	},
	{
		key: "saturation",
		label: "Saturation",
		range: o.saturation,
		defaultValue: a.saturation,
		read: (e) => e.saturation,
		track: (e) => ve(e.hue)
	}
];
function Ee() {
	let e = j.develop.useParamScope();
	return e.maskId === null ? /* @__PURE__ */ A.createElement(De, null) : /* @__PURE__ */ A.createElement(Oe, { scope: e });
}
function De() {
	let { Slider: e } = j.components, { SegmentedControl: t, Toggle: n } = j.ui, r = j.stores.useDevelopStore((e) => e.paramBag), i = N()((e) => e.view), a = T(r);
	return /* @__PURE__ */ A.createElement("div", {
		className: H.panel,
		style: { padding: "6px 8px 8px" }
	}, /* @__PURE__ */ A.createElement("div", { className: H.head }, /* @__PURE__ */ A.createElement("span", { className: H.caption }, "Surface")), /* @__PURE__ */ A.createElement(t, {
		size: "sm",
		value: String(i),
		options: Se,
		onChange: (e) => N().getState().setView(Ce(e))
	}), /* @__PURE__ */ A.createElement("div", null, we.map((t) => /* @__PURE__ */ A.createElement(e, {
		key: t.key,
		label: t.label,
		value: t.read(a),
		min: t.range.min,
		max: t.range.max,
		step: t.range.step,
		defaultValue: t.defaultValue,
		onChange: (e) => B(F, { [t.key]: e }),
		onCommit: () => F.commit(t.label.toLowerCase())
	})), /* @__PURE__ */ A.createElement(n, {
		label: "Invert (darker is nearer)",
		checked: a.invert,
		onChange: (e) => {
			B(F, { invert: e }), F.commit("invert");
		}
	})), /* @__PURE__ */ A.createElement(ke, {
		target: F,
		p: a,
		scope: null
	}));
}
function Oe({ scope: e }) {
	let { maskId: t } = e;
	j.stores.useDevelopStore((e) => e.params.masks);
	let n = I(e);
	return A.useEffect(() => {
		if (t !== null) return N().getState().editScope(e), () => N().getState().leaveMask(t);
	}, [t]), /* @__PURE__ */ A.createElement("div", {
		className: H.panel,
		style: { padding: "6px 8px 8px" }
	}, /* @__PURE__ */ A.createElement(ke, {
		target: n,
		p: n.read(),
		scope: e
	}), /* @__PURE__ */ A.createElement("div", { className: H.hint }, "Lit on the photo's surface: Depth, Detail and Invert are set in the Relight panel."));
}
function ke({ target: e, p: t, scope: n }) {
	let { Slider: r } = j.components, { Button: i } = j.ui, a = N()((e) => (e.scope?.maskId ?? null) === (n?.maskId ?? null)), s = N()((e) => e.selected), c = N()((e) => e.placing) && a, l = a && s >= 0 && s < t.lights.length ? s : -1, u = () => {
		a || N().getState().editScope(n);
	};
	A.useEffect(() => (N().getState().panelShown(!0), () => N().getState().panelShown(!1)), []);
	let d = () => {
		let t = N().getState().spawn ?? {
			u: .5,
			v: .5
		}, n = fe(e, t.u, t.v);
		u(), n >= 0 && N().getState().select(n);
	}, f = (t) => {
		if (R(e, t), !a) return;
		let n = N().getState();
		n.selected === t ? n.select(-1) : n.selected > t && n.select(n.selected - 1);
	}, p = t.lights.length >= 4, m = l >= 0 ? t.lights[l] : null;
	return /* @__PURE__ */ A.createElement(A.Fragment, null, /* @__PURE__ */ A.createElement("div", { className: H.head }, /* @__PURE__ */ A.createElement("span", { className: H.caption }, "Lights"), /* @__PURE__ */ A.createElement("span", { className: H.hint }, `${t.lights.length}/4`)), /* @__PURE__ */ A.createElement(r, {
		label: "Ambient",
		value: t.ambient,
		min: o.ambient.min,
		max: o.ambient.max,
		step: o.ambient.step,
		defaultValue: 100,
		onChange: (t) => B(e, { ambient: t }),
		onCommit: () => e.commit("ambient")
	}), /* @__PURE__ */ A.createElement("button", {
		type: "button",
		className: H.create,
		disabled: p,
		title: p ? "Light limit reached (4)" : "Add a light, then drag it on the photo",
		onClick: d
	}, "+ Add Light"), t.lights.length > 0 ? /* @__PURE__ */ A.createElement(i, {
		size: "sm",
		full: !0,
		active: c,
		title: c ? "Take the lights off the photo (Esc)" : "Show the lights on the photo, to choose and move them",
		onClick: () => {
			if (c) return N().getState().place(!1);
			u(), N().getState().place(!0);
		}
	}, c ? "Done" : "Edit Lights") : null, t.lights.length > 0 ? /* @__PURE__ */ A.createElement("div", { className: H.list }, t.lights.map((e, t) => /* @__PURE__ */ A.createElement("div", {
		key: t,
		className: H.row + (t === l ? ` ${H.on}` : ""),
		title: "Edit this light",
		onClick: () => {
			u(), N().getState().select(t);
		}
	}, /* @__PURE__ */ A.createElement("span", {
		className: H.swatch,
		style: { background: U(e) }
	}), /* @__PURE__ */ A.createElement("span", { className: H.name }, `Light ${t + 1}`), /* @__PURE__ */ A.createElement("button", {
		type: "button",
		title: "Delete light",
		"aria-label": `Delete Light ${t + 1}`,
		className: `${H.remove} ${H.reveal}`,
		onClick: (e) => {
			e.stopPropagation(), f(t);
		}
	}, "×")))) : /* @__PURE__ */ A.createElement("div", { className: H.hint }, "Lower Ambient to deepen the shadows, then add lights to bring light back where you want it."), m ? /* @__PURE__ */ A.createElement("div", { className: H.editor }, Te.map((t) => /* @__PURE__ */ A.createElement(r, {
		key: t.key,
		label: t.label,
		value: t.read(m),
		min: t.range.min,
		max: t.range.max,
		step: t.range.step,
		defaultValue: t.defaultValue,
		trackBackground: t.track?.(m),
		onChange: (n) => z(e, l, { [t.key]: n }),
		onCommit: () => e.commit(`light ${t.label.toLowerCase()}`)
	})), /* @__PURE__ */ A.createElement("div", { className: H.hint }, "Drag the light on the photo to move it.")) : null);
}
function Ae() {
	F.write(i), F.commit("reset"), N().getState().select(-1);
}
//#endregion
//#region src/glsl.ts
function je(e) {
	let t = e.toPrecision(10);
	if (/e/i.test(t)) {
		let [e, n] = t.split(/e/i);
		return `${e.includes(".") ? e : `${e}.0`}e${Number(n)}`;
	}
	return t.includes(".") ? t : `${t}.0`;
}
var G = je;
function Me(e) {
	return e === "linear" ? "vec3 rlInput(vec3 p) { return p; }" : "vec3 rlInput(vec3 p) {\n  vec3 a = abs(p);\n  return sign(p) * mix(a / 12.92, pow((a + 0.055) / 1.055, vec3(2.4)), step(0.04045, a));\n}";
}
var Ne = "\nfloat rlLevelRaw(float beta, int k) { return exp2(beta * float(4 - k)); }\nfloat rlSigmaUnits(int k) { return sqrt((exp2(2.0 * float(k) + 2.0) - 1.0) / 3.0); }\nfloat rlLevelWeight(int k) {\n  float beta = (detail - 50.0) / 50.0;\n  float sum = 0.0;\n  for (int j = 0; j < 9; j++) {\n    sum += rlLevelRaw(beta, j);\n  }\n  return rlLevelRaw(beta, k) / sum;\n}\nfloat rlSlopeWeight(int k) { return rlLevelWeight(k) * rlSigmaUnits(k) / exp2(float(k)); }\nfloat rlHeightWeight(int k) {\n  float beta = (detail - 50.0) / 50.0;\n  float sum = 0.0;\n  for (int j = 0; j < 9; j++) {\n    sum += rlLevelRaw(beta, j) * rlSigmaUnits(j);\n  }\n  return rlLevelRaw(beta, k) * rlSigmaUnits(k) / sum;\n}";
function Pe(e) {
	return `
${Me(e)}
float rlB3(int d) { int a = d < 0 ? -d : d; return a == 0 ? ${G(n[2])} : (a == 1 ? ${G(n[1])} : ${G(n[0])}); }
float rlDB3(int d) { int a = d < 0 ? -d : d; float m = a == 0 ? 0.0 : (a == 1 ? ${G(r[3])} : ${G(r[4])}); return d < 0 ? -m : m; }
float rlLogLum(vec3 p) { return log2(max(luma(rlInput(p)), 0.0) + ${G(.00390625)}); }
${Ne}
`;
}
var Fe = `
{
  float longEdge = max(1.0 / uTexel.x, 1.0 / uTexel.y);
  float s = longEdge / ${G(e)} * exp2(float(uPassIndex));
  bool first = uPassIndex == 0;
  float sum = 0.0;
  float sx = 0.0;
  float sy = 0.0;
  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      vec4 p = readPrev4(vUv + vec2(float(i), float(j)) * s * uTexel);
      float t = first ? rlLogLum(p.rgb) : p.r;
      float bi = rlB3(i);
      float bj = rlB3(j);
      sum += bi * bj * t;
      sx += rlDB3(i) * bj * t;
      sy += bi * rlDB3(j) * t;
    }
  }
  vec3 acc = first ? vec3(0.0) : c.gba;
  float sw = rlSlopeWeight(uPassIndex);
  c = vec4(sum, acc + vec3(sw * sx, sw * sy, rlHeightWeight(uPassIndex) * sum));
}
`, Ie = `
vec3 rlNormal(float gx, float gy) {
  float d = (invert > 0.5 ? -1.0 : 1.0) * depth / ${G(25)};
  return normalize(vec3(-d * gx, -d * gy, 1.0));
}`, Le = `
${Ie}
vec3 rlColour(vec4 tone) {
  float t = tone.y * 0.01;
  vec3 warmth = vec3(1.0 + 0.3 * t, 1.0, max(1.0 - 0.45 * t, 0.0));
  vec3 hue = clamp(abs(mod(tone.z / 60.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  vec3 e = mix(vec3(1.0), hue, clamp(tone.w * 0.01, 0.0, 1.0));
  vec3 k = warmth * mix(e / 12.92, pow((e + 0.055) / 1.055, vec3(2.4)), step(0.04045, e));
  return k / luma(k);
}
float rlShade(vec4 place, vec2 xy, vec2 aspect, vec3 n) {
  float h = place.z * 0.01;
  float e = 0.01 + h * h;
  float r = 0.03 * exp2(7.0 * (1.0 - place.w * 0.01));
  vec3 v = vec3(place.xy * aspect - xy, e);
  float d2 = dot(v, v);
  float lambert = max(dot(n, v) * inversesqrt(d2), 0.0);
  return lambert * (r * r + e * e) / (r * r + d2);
}
`, Re = "\n{\n  vec2 size = 1.0 / uTexel;\n  vec2 aspect = size / max(size.x, size.y);\n  vec3 n = rlNormal(c.g, c.b);\n  vec2 xy = vUv * aspect;\n  vec3 g = vec3(ambient * 0.01);\n  for (int i = 0; i < 4; i++) {\n    if (float(i) < lightCount && lightTone[i].x > 0.0) {\n      g += lightTone[i].x * 0.01 * rlShade(lightPlace[i], xy, aspect, n) * rlColour(lightTone[i]);\n    }\n  }\n  c = vec4(g, 1.0);\n}\n", ze = `
${Ie}
float rlGrey(float h) {
  float g = clamp((h + 8.0) / 9.0, 0.0, 1.0);
  return invert > 0.5 ? 1.0 - g : g;
}
`, Be = "\n{\n  vec3 n = rlNormal(c.g, c.b);\n  vec3 shown = view < 1.5 ? vec3(0.5 + 0.5 * n.x, 0.5 - 0.5 * n.y, 0.5 + 0.5 * n.z) : vec3(rlGrey(c.a));\n  c = vec4(shown, 1.0);\n}\n", Ve = "\nif (on > 0.5) {\n  lin *= lit > 0.5 ? max(stageResult, vec3(0.0)) : vec3(ambient * 0.01);\n}\n", He = "\nif (view > 0.5) {\n  c = stageResult;\n}\n", K = (e, t, n, r) => ({
	key: e,
	glslType: "float",
	default: t,
	...n ? { range: { ...n } } : {},
	...r ? { label: r } : {}
}), q = (e) => ({
	key: e,
	glslType: "vec4",
	length: 4,
	default: Array(16).fill(0)
}), Ue = {
	min: 0,
	max: 9,
	step: 1
}, J = {
	min: 0,
	max: 1,
	step: 1
}, We = () => K("detail", i.detail, o.detail, "detail"), Y = () => K("depth", i.depth, o.depth, "depth"), X = () => K("invert", 0, J, "invert"), Ge = () => K("ambient", i.ambient, o.ambient, "ambient"), Ke = () => K("levels", 0, Ue), Z = () => K("shade", 0, J);
function qe(e) {
	return {
		glsl: Fe,
		helpers: Pe(e),
		channels: 4,
		iterations: {
			key: "levels",
			max: 9
		},
		uniforms: [We(), Ke()],
		keep: !0
	};
}
function Je() {
	return [
		K("on", 0, J),
		K("lit", 0, J),
		Ge(),
		We(),
		Y(),
		X(),
		K("lightCount", 0, {
			min: 0,
			max: 4,
			step: 1
		}),
		q("lightPlace"),
		q("lightTone"),
		Ke(),
		Z()
	];
}
function Ye() {
	return {
		id: h,
		name: "Relight",
		phase: "scene-linear",
		priority: 65,
		glsl: Ve,
		uniforms: Je(),
		passes: [qe("linear"), {
			glsl: Re,
			helpers: Le,
			channels: 4,
			iterations: {
				key: "shade",
				max: 1
			},
			uniforms: [
				Y(),
				X(),
				Ge(),
				K("lightCount", 0, {
					min: 0,
					max: 4,
					step: 1
				}),
				q("lightPlace"),
				q("lightTone"),
				Z()
			]
		}],
		presetScope: "global",
		dormantWhen: { on: 0 },
		mask: { maskable: !0 }
	};
}
function Xe() {
	return {
		id: g,
		name: "Relight surface view",
		phase: "output-encode",
		priority: 1e5,
		space: {
			encoding: "perceptual",
			primaries: "rec709"
		},
		glsl: He,
		uniforms: [K("view", 0, {
			min: 0,
			max: 2,
			step: 1
		})],
		passes: [qe("perceptual"), {
			glsl: Be,
			helpers: ze,
			channels: 4,
			iterations: {
				key: "shade",
				max: 1
			},
			uniforms: [
				K("view", 0, {
					min: 0,
					max: 2,
					step: 1
				}),
				Y(),
				X(),
				Z()
			]
		}],
		presetScope: "per-image",
		dormantWhen: { view: 0 }
	};
}
function Ze() {
	return [Ye(), Xe()];
}
//#endregion
//#region src/view.ts
function Qe() {
	let e = "null", t = () => {
		let t = ce(N().getState().view, T(j.stores.useDevelopStore.getState().paramBag)), n = JSON.stringify(t);
		n !== e && (e = n, j.develop.setViewValues(t));
	}, n = N().subscribe(t), r = j.stores.useDevelopStore.subscribe((e, n) => {
		e.paramBag !== n.paramBag && t();
	});
	return t(), () => {
		n(), r(), e !== "null" && j.develop.setViewValues(null), e = "null";
	};
}
//#endregion
//#region src/index.tsx
var Q = null, $ = [];
function $e(e) {
	le(e), ue(), Q = e;
	for (let t of Ze()) e.registerProcessingStage(t);
	e.registerStylesheet({
		id: ge,
		css: be(e.ui.tokens)
	}), e.registerPanel({
		id: _,
		title: "Relight",
		component: Ee,
		defaultDock: {
			module: "develop",
			direction: "right",
			width: 268
		},
		onReset: Ae,
		mask: {
			component: Ee,
			owns: ie()
		}
	}), e.registerSlot({
		id: v,
		slot: "develop-canvas-overlay",
		component: xe
	}), $ = [e.stores.useDevelopStore.subscribe((e, t) => {
		if (e.paramBag === t.paramBag) return;
		let n = ae(e.paramBag);
		n && e.setDynParams(n);
	}), Qe()];
}
function et() {
	let e = Q;
	if (e) {
		Q = null;
		try {
			for (let e of $) e();
			$ = [];
			for (let t of Ze()) e.unregisterProcessingStage(t.id);
		} catch (e) {
			console.warn("[relight] deactivate failed:", e);
		}
	}
}
//#endregion
export { m as EXT_ID, _ as PANEL_ID, $e as activate, et as deactivate };

//# sourceMappingURL=index.js.map
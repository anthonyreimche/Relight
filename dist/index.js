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
	warmth: 0
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
	warmth: {
		min: -100,
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
function d(e, t, n) {
	return .2126 * e + .7152 * t + .0722 * n;
}
function f(e) {
	let t = e / 100, n = 1 + .3 * t, r = Math.max(1 - .45 * t, 0), i = d(n, 1, r);
	return [
		n / i,
		1 / i,
		r / i
	];
}
//#endregion
//#region src/params.ts
var p = "relight", m = `${p}.light`, h = `${p}.view`, g = `${p}.panel`, _ = `${p}.overlay`, v = [
	"on",
	"lit",
	"ambient",
	"detail",
	"depth",
	"invert",
	"lightCount",
	"levels",
	"shade"
], ee = ["lightPlace", "lightTone"], y = (e) => `${m}.${e}`, b = (e) => `${h}.${e}`, x = (e) => typeof e == "number" && Number.isFinite(e);
function S(e, t, n, r) {
	let i = e[y(t)];
	return x(i) ? Math.min(Math.max(i, n.min), n.max) : r;
}
var C = (e, t) => Math.min(Math.max(e, t.min), t.max);
function te(e) {
	let n = e[y("lightPlace")], r = e[y("lightTone")], i = S(e, "lightCount", {
		min: 0,
		max: 4
	}, 0);
	if (!Array.isArray(n) || !Array.isArray(r) || n.length !== 16 || r.length !== 16) return [];
	let a = [];
	for (let e = 0; e < Math.floor(i); e++) {
		let i = [...n.slice(e * 4, e * 4 + 4), ...r.slice(e * 4, e * 4 + 2)].filter(x);
		if (i.length !== 6) continue;
		let [s, c, l, u, d, f] = i;
		a.push({
			u: C(s, t),
			v: C(c, t),
			height: C(l, o.height),
			falloff: C(u, o.falloff),
			intensity: C(d, o.intensity),
			warmth: C(f, o.warmth)
		});
	}
	return a;
}
function w(e) {
	return {
		ambient: S(e, "ambient", o.ambient, i.ambient),
		detail: S(e, "detail", o.detail, i.detail),
		depth: S(e, "depth", o.depth, i.depth),
		invert: S(e, "invert", {
			min: 0,
			max: 1
		}, 0) > .5,
		lights: te(e)
	};
}
function ne(e) {
	let t = Array(16).fill(0), n = Array(16).fill(0);
	return e.slice(0, 4).forEach((e, r) => {
		t.splice(r * 4, 4, e.u, e.v, e.height, e.falloff), n.splice(r * 4, 2, e.intensity, e.warmth);
	}), {
		place: t,
		tone: n
	};
}
function T(e) {
	let t = e.lights.slice(0, 4), { place: n, tone: r } = ne(t), i = c(e);
	return {
		[y("on")]: +!!l(e),
		[y("lit")]: +!!i,
		[y("ambient")]: e.ambient,
		[y("detail")]: e.detail,
		[y("depth")]: e.depth,
		[y("invert")]: +!!e.invert,
		[y("lightCount")]: t.length,
		[y("lightPlace")]: n,
		[y("lightTone")]: r,
		[y("levels")]: i ? 9 : 0,
		[y("shade")]: +!!i
	};
}
function re() {
	return [...v, ...ee].map(y);
}
var ie = [
	"on",
	"lit",
	"levels",
	"shade"
], ae = [
	"ambient",
	"detail",
	"depth",
	"invert",
	"lightCount",
	"lightPlace",
	"lightTone"
];
function oe(e) {
	if (!ae.some((t) => y(t) in e)) return null;
	let t = T(w(e));
	if (!ie.some((n) => {
		let r = e[y(n)];
		return (x(r) ? r : 0) !== t[y(n)];
	})) return null;
	let n = {};
	for (let e of ie) n[y(e)] = t[y(e)];
	return n;
}
function E(e, t) {
	return {
		...e,
		depth: t.depth,
		detail: t.detail,
		invert: t.invert
	};
}
var se = [
	"depth",
	"detail",
	"invert"
];
function ce(e, t) {
	let n = w(t), r = T(n), i = !1, a = e.map((e) => {
		let t = e.bag;
		return !t || !ae.some((e) => y(e) in t) || se.every((e) => t[y(e)] === r[y(e)]) ? e : (i = !0, {
			...e,
			bag: {
				...t,
				...T(E(w(t), n))
			}
		});
	});
	return i ? a : null;
}
function le(e, t) {
	return e === 0 ? null : {
		[b("view")]: e,
		[b("detail")]: t.detail,
		[b("depth")]: t.depth,
		[b("invert")]: +!!t.invert,
		[b("levels")]: 9,
		[b("shade")]: 1,
		[y("on")]: 0,
		[y("levels")]: 0,
		[y("shade")]: 0
	};
}
//#endregion
//#region src/rt.ts
var D, O;
function ue(e) {
	O = e, D = e.react;
}
//#endregion
//#region src/store.ts
var k = null;
function de() {
	k = O.stores.create()((e) => ({
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
function A() {
	if (!k) throw Error("Relight's store is used before activate()");
	return k;
}
//#endregion
//#region src/edit.ts
var j = () => w(O.stores.useDevelopStore.getState().paramBag), M = {
	read: j,
	write: (e) => {
		let t = O.stores.useDevelopStore.getState(), n = j(), r = T(e);
		if (t.setDynParams(r), n.depth === e.depth && n.detail === e.detail && n.invert === e.invert) return;
		let i = ce(t.params.masks, r);
		i && t.setParam("masks", i);
	},
	commit: (e) => void O.stores.useDevelopStore.getState().commitEdit(`Relight ${e}`)
};
function fe(e) {
	return {
		read: () => E(w(e.getParams()), j()),
		write: (t) => e.setParams(T(E(t, j()))),
		commit: (t) => e.commit(`Relight ${t}`)
	};
}
function pe() {
	let e = A().getState().scope;
	return e ? fe(e) : M;
}
var N = (e) => Math.min(Math.max(e, t.min), t.max);
function me(e, t, n) {
	let r = e.read();
	return r.lights.length >= 4 ? -1 : (e.write({
		...r,
		lights: [...r.lights, {
			u: N(t),
			v: N(n),
			...a
		}]
	}), e.commit("add light"), r.lights.length);
}
function P(e, t) {
	let n = e.read();
	t < 0 || t >= n.lights.length || (e.write({
		...n,
		lights: n.lights.filter((e, n) => n !== t)
	}), e.commit("remove light"));
}
function F(e, t, n) {
	let r = e.read(), i = r.lights[t];
	if (!i) return;
	let a = {
		...i,
		...n
	};
	a.u = N(a.u), a.v = N(a.v), e.write({
		...r,
		lights: r.lights.map((e, n) => n === t ? a : e)
	});
}
function I(e, t) {
	e.write({
		...e.read(),
		...t
	});
}
//#endregion
//#region src/mapping.ts
function he(e) {
	let { rect: t, toScreen: n, toImage: r, radiusToScreen: i, imageAspect: a } = e;
	return !t || !n || !r || !i ? null : {
		rect: t,
		toScreen: n,
		toImage: r,
		radiusToScreen: i,
		imageAspect: a
	};
}
function ge(e, t, n) {
	let r = n.getBoundingClientRect(), i = n.offsetWidth > 0 && r.width > 0 ? r.width / n.offsetWidth : 1;
	return {
		x: (e - r.left) / i,
		y: (t - r.top) / i
	};
}
function _e(e, t) {
	return e * Math.max(t, 1);
}
//#endregion
//#region src/styles.ts
var L = "safelight-relight", ve = "relight.styles", R = {
	panel: `${L}-panel`,
	create: `${L}-create`,
	head: `${L}-head`,
	caption: `${L}-caption`,
	hint: `${L}-hint`,
	list: `${L}-list`,
	row: `${L}-row`,
	on: `${L}-on`,
	swatch: `${L}-swatch`,
	name: `${L}-name`,
	remove: `${L}-remove`,
	reveal: `${L}-reveal`,
	editor: `${L}-editor`
};
function z(e) {
	let t = f(e), n = Math.max(...t), r = (e) => e <= .0031308 ? 12.92 * e : 1.055 * e ** (1 / 2.4) - .055, [i, a, o] = t.map((e) => Math.round(255 * r(e / n)));
	return `rgb(${i}, ${a}, ${o})`;
}
var ye = (e, t) => `color-mix(in srgb, ${e} ${t}%, transparent)`;
function be(e) {
	return `
:where(.${R.panel} > :not(:last-child)) { margin-block: 0 0.5rem; }
:where(.${R.create}) { display: flex; width: 100%; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.25rem; background-color: ${e.surface2}; padding: 0.375rem 0.5rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${R.create}:hover) { color: ${e.textPrimary}; }
:where(.${R.create}:disabled) { cursor: default; opacity: 0.4; }
:where(.${R.head}) { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
:where(.${R.caption}) { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: ${e.textMuted}; }
:where(.${R.hint}) { font-size: 10px; line-height: 1.4; color: ${e.textMuted}; }
:where(.${R.list} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${R.row}) { display: flex; cursor: pointer; align-items: center; gap: 0.375rem; border-radius: 0.25rem; padding: 0.25rem 0.375rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${R.row}:hover) { background-color: ${e.surface2}; }
:where(.${R.row}.${R.on}) { background-color: ${ye(e.accent, 20)}; color: ${e.textPrimary}; }
:where(.${R.swatch}) { height: 0.625rem; width: 0.625rem; flex-shrink: 0; border-radius: 9999px; border: 1px solid ${e.borderSubtle}; }
:where(.${R.name}) { flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.${R.remove}) { border-radius: 0.25rem; padding: 0 0.25rem; color: ${e.textMuted}; }
:where(.${R.remove}:hover) { color: ${e.labelRed}; }
:where(.${R.reveal}) { opacity: 0; }
:where(.${R.row}:hover .${R.reveal}) { opacity: 1; }
:where(.${R.editor}) { border-top: 1px solid ${e.borderSubtle}; padding-top: 0.5rem; }
:where(.${R.editor} > :not(:last-child)) { margin-block: 0 0.375rem; }
html.sl-larger-text .${R.hint}, html.sl-larger-text .${R.caption} { font-size: 12px !important; }
html.sl-larger-text .${R.create}, html.sl-larger-text .${R.row} { font-size: 13px !important; line-height: 1.45 !important; }
html.sl-larger-text .${R.caption} { text-transform: none !important; letter-spacing: normal !important; }
`;
}
//#endregion
//#region src/Overlay.tsx
var B = 16;
function xe() {
	let e = O.develop.useDevelopOverlay(), t = he(e);
	O.stores.useDevelopStore((e) => e.paramBag), O.stores.useDevelopStore((e) => e.params.masks), A()((e) => e.scope);
	let n = O.stores.useDevelopStore((e) => e.photoId), r = A()((e) => e.panels), i = A()((e) => e.placing) && r > 0, a = A()((e) => e.selected), o = D.useRef(null), s = D.useRef(null);
	D.useEffect(() => {
		let e = t;
		if (!e) return;
		let n = e.toImage(e.rect.x + e.rect.w / 3, e.rect.y + e.rect.h / 3);
		A().getState().setSpawn({
			u: n.x,
			v: n.y
		});
	}, [
		e.nonce,
		t?.rect.x,
		t?.rect.y,
		t?.rect.w,
		t?.rect.h
	]), D.useEffect(() => {
		s.current = null;
	}, [n]), D.useEffect(() => i ? O.ui.onEscape(() => A().getState().place(!1)) : void 0, [i]);
	let c = pe(), l = c.read().lights;
	if (!t || !i || !n || l.length === 0) return null;
	let d = t, f = (e) => o.current ? ge(e.clientX, e.clientY, o.current) : null, p = (e) => (t) => {
		if (t.button !== 0) return;
		let n = f(t);
		if (!n) return;
		t.preventDefault(), t.stopPropagation(), t.currentTarget.setPointerCapture(t.pointerId), t.currentTarget.focus(), A().getState().select(e);
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
		t.moved = !0, F(c, t.index, {
			u: r.x,
			v: r.y
		});
	}, h = (e) => {
		let t = s.current;
		t && t.pointerId === e.pointerId && (s.current = null, e.currentTarget.hasPointerCapture(e.pointerId) && e.currentTarget.releasePointerCapture(e.pointerId), t.moved && c.commit("move light"));
	}, g = (e) => (t) => {
		(t.key === "Delete" || t.key === "Backspace") && (t.preventDefault(), t.stopPropagation(), P(c, e), A().getState().select(-1));
	}, _ = a >= 0 && a < l.length ? l[a] : null, v = _ ? {
		at: d.toScreen(_.u, _.v),
		r: d.radiusToScreen(_e(u(_.falloff), d.imageAspect))
	} : null, ee = O.cursors.resolve("crop-move");
	return /* @__PURE__ */ D.createElement("div", {
		ref: o,
		style: {
			position: "absolute",
			inset: 0,
			overflow: "hidden",
			pointerEvents: "none"
		}
	}, v ? /* @__PURE__ */ D.createElement("div", {
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
		return /* @__PURE__ */ D.createElement("button", {
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
				left: n.x - B / 2,
				top: n.y - B / 2,
				width: B,
				height: B,
				padding: 0,
				borderRadius: "50%",
				background: z(e.warmth),
				border: r ? "2px solid var(--color-accent)" : "2px solid rgba(255,255,255,0.9)",
				boxShadow: "0 0 0 1px rgba(0,0,0,0.6), 0 1px 4px rgba(0,0,0,0.5)",
				opacity: e.intensity > 0 ? 1 : .5,
				cursor: ee,
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
		key: "warmth",
		label: "Warmth",
		range: o.warmth,
		defaultValue: 0,
		read: (e) => e.warmth
	}
];
function V() {
	let e = O.develop.useParamScope();
	return e.maskId === null ? /* @__PURE__ */ D.createElement(Ee, null) : /* @__PURE__ */ D.createElement(De, { scope: e });
}
function Ee() {
	let { Slider: e } = O.components, { SegmentedControl: t, Toggle: n } = O.ui, r = O.stores.useDevelopStore((e) => e.paramBag), i = A()((e) => e.view), a = w(r);
	return /* @__PURE__ */ D.createElement("div", {
		className: R.panel,
		style: { padding: "6px 8px 8px" }
	}, /* @__PURE__ */ D.createElement("div", { className: R.head }, /* @__PURE__ */ D.createElement("span", { className: R.caption }, "Surface")), /* @__PURE__ */ D.createElement(t, {
		size: "sm",
		value: String(i),
		options: Se,
		onChange: (e) => A().getState().setView(Ce(e))
	}), /* @__PURE__ */ D.createElement("div", null, we.map((t) => /* @__PURE__ */ D.createElement(e, {
		key: t.key,
		label: t.label,
		value: t.read(a),
		min: t.range.min,
		max: t.range.max,
		step: t.range.step,
		defaultValue: t.defaultValue,
		onChange: (e) => I(M, { [t.key]: e }),
		onCommit: () => M.commit(t.label.toLowerCase())
	})), /* @__PURE__ */ D.createElement(n, {
		label: "Invert (darker is nearer)",
		checked: a.invert,
		onChange: (e) => {
			I(M, { invert: e }), M.commit("invert");
		}
	})), /* @__PURE__ */ D.createElement(H, {
		target: M,
		p: a,
		scope: null
	}));
}
function De({ scope: e }) {
	let { maskId: t } = e;
	O.stores.useDevelopStore((e) => e.params.masks);
	let n = fe(e);
	return D.useEffect(() => {
		if (t !== null) return A().getState().editScope(e), () => A().getState().leaveMask(t);
	}, [t]), /* @__PURE__ */ D.createElement("div", {
		className: R.panel,
		style: { padding: "6px 8px 8px" }
	}, /* @__PURE__ */ D.createElement(H, {
		target: n,
		p: n.read(),
		scope: e
	}), /* @__PURE__ */ D.createElement("div", { className: R.hint }, "Lit on the photo's surface: Depth, Detail and Invert are set in the Relight panel."));
}
function H({ target: e, p: t, scope: n }) {
	let { Slider: r } = O.components, { Button: i } = O.ui, a = A()((e) => (e.scope?.maskId ?? null) === (n?.maskId ?? null)), s = A()((e) => e.selected), c = A()((e) => e.placing) && a, l = a && s >= 0 && s < t.lights.length ? s : -1, u = () => {
		a || A().getState().editScope(n);
	};
	D.useEffect(() => (A().getState().panelShown(!0), () => A().getState().panelShown(!1)), []);
	let d = () => {
		let t = A().getState().spawn ?? {
			u: .5,
			v: .5
		}, n = me(e, t.u, t.v);
		u(), n >= 0 && A().getState().select(n);
	}, f = (t) => {
		if (P(e, t), !a) return;
		let n = A().getState();
		n.selected === t ? n.select(-1) : n.selected > t && n.select(n.selected - 1);
	}, p = t.lights.length >= 4, m = l >= 0 ? t.lights[l] : null;
	return /* @__PURE__ */ D.createElement(D.Fragment, null, /* @__PURE__ */ D.createElement("div", { className: R.head }, /* @__PURE__ */ D.createElement("span", { className: R.caption }, "Lights"), /* @__PURE__ */ D.createElement("span", { className: R.hint }, `${t.lights.length}/4`)), /* @__PURE__ */ D.createElement(r, {
		label: "Ambient",
		value: t.ambient,
		min: o.ambient.min,
		max: o.ambient.max,
		step: o.ambient.step,
		defaultValue: 100,
		onChange: (t) => I(e, { ambient: t }),
		onCommit: () => e.commit("ambient")
	}), /* @__PURE__ */ D.createElement("button", {
		type: "button",
		className: R.create,
		disabled: p,
		title: p ? "Light limit reached (4)" : "Add a light, then drag it on the photo",
		onClick: d
	}, "+ Add Light"), t.lights.length > 0 ? /* @__PURE__ */ D.createElement(i, {
		size: "sm",
		full: !0,
		active: c,
		title: c ? "Take the lights off the photo (Esc)" : "Show the lights on the photo, to choose and move them",
		onClick: () => {
			if (c) return A().getState().place(!1);
			u(), A().getState().place(!0);
		}
	}, c ? "Done" : "Edit Lights") : null, t.lights.length > 0 ? /* @__PURE__ */ D.createElement("div", { className: R.list }, t.lights.map((e, t) => /* @__PURE__ */ D.createElement("div", {
		key: t,
		className: R.row + (t === l ? ` ${R.on}` : ""),
		title: "Edit this light",
		onClick: () => {
			u(), A().getState().select(t);
		}
	}, /* @__PURE__ */ D.createElement("span", {
		className: R.swatch,
		style: { background: z(e.warmth) }
	}), /* @__PURE__ */ D.createElement("span", { className: R.name }, `Light ${t + 1}`), /* @__PURE__ */ D.createElement("button", {
		type: "button",
		title: "Delete light",
		"aria-label": `Delete Light ${t + 1}`,
		className: `${R.remove} ${R.reveal}`,
		onClick: (e) => {
			e.stopPropagation(), f(t);
		}
	}, "×")))) : /* @__PURE__ */ D.createElement("div", { className: R.hint }, "Lower Ambient to deepen the shadows, then add lights to bring light back where you want it."), m ? /* @__PURE__ */ D.createElement("div", { className: R.editor }, Te.map((t) => /* @__PURE__ */ D.createElement(r, {
		key: t.key,
		label: t.label,
		value: t.read(m),
		min: t.range.min,
		max: t.range.max,
		step: t.range.step,
		defaultValue: t.defaultValue,
		onChange: (n) => F(e, l, { [t.key]: n }),
		onCommit: () => e.commit(`light ${t.label.toLowerCase()}`)
	})), /* @__PURE__ */ D.createElement("div", { className: R.hint }, "Drag the light on the photo to move it.")) : null);
}
function Oe() {
	M.write(i), M.commit("reset"), A().getState().select(-1);
}
//#endregion
//#region src/glsl.ts
function ke(e) {
	let t = e.toPrecision(10);
	if (/e/i.test(t)) {
		let [e, n] = t.split(/e/i);
		return `${e.includes(".") ? e : `${e}.0`}e${Number(n)}`;
	}
	return t.includes(".") ? t : `${t}.0`;
}
var U = ke;
function Ae(e) {
	return e === "linear" ? "vec3 rlInput(vec3 p) { return p; }" : "vec3 rlInput(vec3 p) {\n  vec3 a = abs(p);\n  return sign(p) * mix(a / 12.92, pow((a + 0.055) / 1.055, vec3(2.4)), step(0.04045, a));\n}";
}
var je = "\nfloat rlLevelRaw(float beta, int k) { return exp2(beta * float(4 - k)); }\nfloat rlSigmaUnits(int k) { return sqrt((exp2(2.0 * float(k) + 2.0) - 1.0) / 3.0); }\nfloat rlLevelWeight(int k) {\n  float beta = (detail - 50.0) / 50.0;\n  float sum = 0.0;\n  for (int j = 0; j < 9; j++) {\n    sum += rlLevelRaw(beta, j);\n  }\n  return rlLevelRaw(beta, k) / sum;\n}\nfloat rlSlopeWeight(int k) { return rlLevelWeight(k) * rlSigmaUnits(k) / exp2(float(k)); }\nfloat rlHeightWeight(int k) {\n  float beta = (detail - 50.0) / 50.0;\n  float sum = 0.0;\n  for (int j = 0; j < 9; j++) {\n    sum += rlLevelRaw(beta, j) * rlSigmaUnits(j);\n  }\n  return rlLevelRaw(beta, k) * rlSigmaUnits(k) / sum;\n}";
function Me(e) {
	return `
${Ae(e)}
float rlB3(int d) { int a = d < 0 ? -d : d; return a == 0 ? ${U(n[2])} : (a == 1 ? ${U(n[1])} : ${U(n[0])}); }
float rlDB3(int d) { int a = d < 0 ? -d : d; float m = a == 0 ? 0.0 : (a == 1 ? ${U(r[3])} : ${U(r[4])}); return d < 0 ? -m : m; }
float rlLogLum(vec3 p) { return log2(max(luma(rlInput(p)), 0.0) + ${U(.00390625)}); }
${je}
`;
}
var Ne = `
{
  float longEdge = max(1.0 / uTexel.x, 1.0 / uTexel.y);
  float s = longEdge / ${U(e)} * exp2(float(uPassIndex));
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
`, W = `
vec3 rlNormal(float gx, float gy) {
  float d = (invert > 0.5 ? -1.0 : 1.0) * depth / ${U(25)};
  return normalize(vec3(-d * gx, -d * gy, 1.0));
}`, Pe = `
${W}
vec3 rlWarmth(float w) {
  float t = w * 0.01;
  vec3 k = vec3(1.0 + 0.3 * t, 1.0, max(1.0 - 0.45 * t, 0.0));
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
`, Fe = "\n{\n  vec2 size = 1.0 / uTexel;\n  vec2 aspect = size / max(size.x, size.y);\n  vec3 n = rlNormal(c.g, c.b);\n  vec2 xy = vUv * aspect;\n  vec3 g = vec3(ambient * 0.01);\n  for (int i = 0; i < 4; i++) {\n    if (float(i) < lightCount && lightTone[i].x > 0.0) {\n      g += lightTone[i].x * 0.01 * rlShade(lightPlace[i], xy, aspect, n) * rlWarmth(lightTone[i].y);\n    }\n  }\n  c = vec4(g, 1.0);\n}\n", Ie = `
${W}
float rlGrey(float h) {
  float g = clamp((h + 8.0) / 9.0, 0.0, 1.0);
  return invert > 0.5 ? 1.0 - g : g;
}
`, Le = "\n{\n  vec3 n = rlNormal(c.g, c.b);\n  vec3 shown = view < 1.5 ? vec3(0.5 + 0.5 * n.x, 0.5 - 0.5 * n.y, 0.5 + 0.5 * n.z) : vec3(rlGrey(c.a));\n  c = vec4(shown, 1.0);\n}\n", Re = "\nif (on > 0.5) {\n  lin *= lit > 0.5 ? max(stageResult, vec3(0.0)) : vec3(ambient * 0.01);\n}\n", ze = "\nif (view > 0.5) {\n  c = stageResult;\n}\n", G = (e, t, n, r) => ({
	key: e,
	glslType: "float",
	default: t,
	...n ? { range: { ...n } } : {},
	...r ? { label: r } : {}
}), K = (e) => ({
	key: e,
	glslType: "vec4",
	length: 4,
	default: Array(16).fill(0)
}), Be = {
	min: 0,
	max: 9,
	step: 1
}, q = {
	min: 0,
	max: 1,
	step: 1
}, Ve = () => G("detail", i.detail, o.detail, "detail"), J = () => G("depth", i.depth, o.depth, "depth"), Y = () => G("invert", 0, q, "invert"), He = () => G("ambient", i.ambient, o.ambient, "ambient"), Ue = () => G("levels", 0, Be), X = () => G("shade", 0, q);
function Z(e) {
	return {
		glsl: Ne,
		helpers: Me(e),
		channels: 4,
		iterations: {
			key: "levels",
			max: 9
		},
		uniforms: [Ve(), Ue()],
		keep: !0
	};
}
function We() {
	return [
		G("on", 0, q),
		G("lit", 0, q),
		He(),
		Ve(),
		J(),
		Y(),
		G("lightCount", 0, {
			min: 0,
			max: 4,
			step: 1
		}),
		K("lightPlace"),
		K("lightTone"),
		Ue(),
		X()
	];
}
function Ge() {
	return {
		id: m,
		name: "Relight",
		phase: "scene-linear",
		priority: 65,
		glsl: Re,
		uniforms: We(),
		passes: [Z("linear"), {
			glsl: Fe,
			helpers: Pe,
			channels: 4,
			iterations: {
				key: "shade",
				max: 1
			},
			uniforms: [
				J(),
				Y(),
				He(),
				G("lightCount", 0, {
					min: 0,
					max: 4,
					step: 1
				}),
				K("lightPlace"),
				K("lightTone"),
				X()
			]
		}],
		presetScope: "global",
		dormantWhen: { on: 0 },
		mask: { maskable: !0 }
	};
}
function Ke() {
	return {
		id: h,
		name: "Relight surface view",
		phase: "output-encode",
		priority: 1e5,
		space: {
			encoding: "perceptual",
			primaries: "rec709"
		},
		glsl: ze,
		uniforms: [G("view", 0, {
			min: 0,
			max: 2,
			step: 1
		})],
		passes: [Z("perceptual"), {
			glsl: Le,
			helpers: Ie,
			channels: 4,
			iterations: {
				key: "shade",
				max: 1
			},
			uniforms: [
				G("view", 0, {
					min: 0,
					max: 2,
					step: 1
				}),
				J(),
				Y(),
				X()
			]
		}],
		presetScope: "per-image",
		dormantWhen: { view: 0 }
	};
}
function qe() {
	return [Ge(), Ke()];
}
//#endregion
//#region src/view.ts
function Je() {
	let e = "null", t = () => {
		let t = le(A().getState().view, w(O.stores.useDevelopStore.getState().paramBag)), n = JSON.stringify(t);
		n !== e && (e = n, O.develop.setViewValues(t));
	}, n = A().subscribe(t), r = O.stores.useDevelopStore.subscribe((e, n) => {
		e.paramBag !== n.paramBag && t();
	});
	return t(), () => {
		n(), r(), e !== "null" && O.develop.setViewValues(null), e = "null";
	};
}
//#endregion
//#region src/index.tsx
var Q = null, $ = [];
function Ye(e) {
	ue(e), de(), Q = e;
	for (let t of qe()) e.registerProcessingStage(t);
	e.registerStylesheet({
		id: ve,
		css: be(e.ui.tokens)
	}), e.registerPanel({
		id: g,
		title: "Relight",
		component: V,
		defaultDock: {
			module: "develop",
			direction: "right",
			width: 268
		},
		onReset: Oe,
		mask: {
			component: V,
			owns: re()
		}
	}), e.registerSlot({
		id: _,
		slot: "develop-canvas-overlay",
		component: xe
	}), $ = [e.stores.useDevelopStore.subscribe((e, t) => {
		if (e.paramBag === t.paramBag) return;
		let n = oe(e.paramBag);
		n && e.setDynParams(n);
	}), Je()];
}
function Xe() {
	let e = Q;
	if (e) {
		Q = null;
		try {
			for (let e of $) e();
			$ = [];
			for (let t of qe()) e.unregisterProcessingStage(t.id);
		} catch (e) {
			console.warn("[relight] deactivate failed:", e);
		}
	}
}
//#endregion
export { p as EXT_ID, g as PANEL_ID, Ye as activate, Xe as deactivate };

//# sourceMappingURL=index.js.map
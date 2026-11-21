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
var m = "relight", h = `${m}.light`, g = `${m}.view`, _ = `${m}.panel`, v = `${m}.overlay`, ee = [
	"on",
	"lit",
	"ambient",
	"detail",
	"depth",
	"invert",
	"lightCount",
	"levels",
	"shade"
], te = ["lightPlace", "lightTone"], y = (e) => `${h}.${e}`, b = (e) => `${g}.${e}`, x = (e) => typeof e == "number" && Number.isFinite(e);
function S(e, t, n, r) {
	let i = e[y(t)];
	return x(i) ? Math.min(Math.max(i, n.min), n.max) : r;
}
var C = (e, t) => Math.min(Math.max(e, t.min), t.max), ne = {
	min: -100,
	max: 100
};
function re(e) {
	let n = e[y("lightPlace")], r = e[y("lightTone")], i = S(e, "lightCount", {
		min: 0,
		max: 4
	}, 0);
	if (!Array.isArray(n) || !Array.isArray(r) || n.length !== 16 || r.length !== 16) return [];
	let a = [];
	for (let e = 0; e < Math.floor(i); e++) {
		let i = [...n.slice(e * 4, e * 4 + 4), ...r.slice(e * 4, e * 4 + 4)].filter(x);
		if (i.length !== 8) continue;
		let [s, c, l, u, d, f, m, h] = i, g = f === 0 ? {
			hue: m,
			saturation: h
		} : p(C(f, ne));
		a.push({
			u: C(s, t),
			v: C(c, t),
			height: C(l, o.height),
			falloff: C(u, o.falloff),
			intensity: C(d, o.intensity),
			hue: C(g.hue, o.hue),
			saturation: C(g.saturation, o.saturation)
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
		lights: re(e)
	};
}
function ie(e) {
	let t = Array(16).fill(0), n = Array(16).fill(0);
	return e.slice(0, 4).forEach((e, r) => {
		t.splice(r * 4, 4, e.u, e.v, e.height, e.falloff), n.splice(r * 4, 4, e.intensity, 0, e.hue, e.saturation);
	}), {
		place: t,
		tone: n
	};
}
function T(e) {
	let t = e.lights.slice(0, 4), { place: n, tone: r } = ie(t), i = c(e);
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
function ae() {
	return [...ee, ...te].map(y);
}
var oe = [
	"on",
	"lit",
	"levels",
	"shade"
], se = [
	"ambient",
	"detail",
	"depth",
	"invert",
	"lightCount",
	"lightPlace",
	"lightTone"
];
function ce(e) {
	if (!se.some((t) => y(t) in e)) return null;
	let t = T(w(e));
	if (!oe.some((n) => {
		let r = e[y(n)];
		return (x(r) ? r : 0) !== t[y(n)];
	})) return null;
	let n = {};
	for (let e of oe) n[y(e)] = t[y(e)];
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
var le = [
	"depth",
	"detail",
	"invert"
];
function ue(e, t) {
	let n = w(t), r = T(n), i = !1, a = e.map((e) => {
		let t = e.bag;
		return !t || !se.some((e) => y(e) in t) || le.every((e) => t[y(e)] === r[y(e)]) ? e : (i = !0, {
			...e,
			bag: {
				...t,
				...T(E(w(t), n))
			}
		});
	});
	return i ? a : null;
}
function de(e, t) {
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
function fe(e) {
	O = e, D = e.react;
}
//#endregion
//#region src/store.ts
var k = null;
function pe() {
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
		let i = ue(t.params.masks, r);
		i && t.setParam("masks", i);
	},
	commit: (e) => void O.stores.useDevelopStore.getState().commitEdit(`Relight ${e}`)
};
function me(e) {
	return {
		read: () => E(w(e.getParams()), j()),
		write: (t) => e.setParams(T(E(t, j()))),
		commit: (t) => e.commit(`Relight ${t}`)
	};
}
function he() {
	let e = A().getState().scope;
	return e ? me(e) : M;
}
var N = (e) => Math.min(Math.max(e, t.min), t.max);
function ge(e, t, n) {
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
function _e(e) {
	let { rect: t, toScreen: n, toImage: r, radiusToScreen: i, imageAspect: a } = e;
	return !t || !n || !r || !i ? null : {
		rect: t,
		toScreen: n,
		toImage: r,
		radiusToScreen: i,
		imageAspect: a
	};
}
function ve(e, t, n) {
	let r = n.getBoundingClientRect(), i = n.offsetWidth > 0 && r.width > 0 ? r.width / n.offsetWidth : 1;
	return {
		x: (e - r.left) / i,
		y: (t - r.top) / i
	};
}
function ye(e, t) {
	return e * Math.max(t, 1);
}
//#endregion
//#region src/styles.ts
var L = "safelight-relight", be = "relight.styles", R = {
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
function z({ hue: e, saturation: t }) {
	let [n, r, i] = f(e, t).map((e) => Math.round(255 * e));
	return `rgb(${n}, ${r}, ${i})`;
}
var xe = `linear-gradient(to right, ${[
	0,
	60,
	120,
	180,
	240,
	300,
	360
].map((e) => z({
	hue: e,
	saturation: 100
})).join(", ")})`;
function Se(e) {
	return `linear-gradient(to right, ${z({
		hue: e,
		saturation: 0
	})}, ${z({
		hue: e,
		saturation: 100
	})})`;
}
var Ce = (e, t) => `color-mix(in srgb, ${e} ${t}%, transparent)`;
function we(e) {
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
:where(.${R.row}.${R.on}) { background-color: ${Ce(e.accent, 20)}; color: ${e.textPrimary}; }
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
function Te() {
	let e = O.develop.useDevelopOverlay(), t = _e(e);
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
	let c = he(), l = c.read().lights;
	if (!t || !i || !n || l.length === 0) return null;
	let d = t, f = (e) => o.current ? ve(e.clientX, e.clientY, o.current) : null, p = (e) => (t) => {
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
		r: d.radiusToScreen(ye(u(_.falloff), d.imageAspect))
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
				background: z(e),
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
var Ee = "The shape Relight reads from the photo: brighter parts stand nearer. Lights fall across this shape, so they model the subject instead of laying a flat glow on it.", De = [
	{
		value: "0",
		label: "Photo",
		title: "Show the photo"
	},
	{
		value: "1",
		label: "Normals",
		title: "Preview which way each part of the surface faces, as colours"
	},
	{
		value: "2",
		label: "Height",
		title: "Preview the surface's height: lighter is nearer"
	}
], Oe = (e) => e === "1" ? 1 : e === "2" ? 2 : 0, ke = [{
	key: "depth",
	label: "Depth",
	range: o.depth,
	defaultValue: 50,
	read: (e) => e.depth,
	tip: "How deep the surface is: higher makes lights model the shapes more strongly"
}, {
	key: "detail",
	label: "Detail",
	range: o.detail,
	defaultValue: 50,
	read: (e) => e.detail,
	tip: "Higher follows fine texture, lower follows broad shapes"
}], Ae = [
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
		track: () => xe
	},
	{
		key: "saturation",
		label: "Saturation",
		range: o.saturation,
		defaultValue: a.saturation,
		read: (e) => e.saturation,
		track: (e) => Se(e.hue)
	}
];
function V() {
	let e = O.develop.useParamScope();
	return e.maskId === null ? /* @__PURE__ */ D.createElement(je, null) : /* @__PURE__ */ D.createElement(Me, { scope: e });
}
function je() {
	let { Slider: e } = O.components, { SegmentedControl: t, Toggle: n } = O.ui, r = O.stores.useDevelopStore((e) => e.paramBag), i = A()((e) => e.view), a = w(r);
	return /* @__PURE__ */ D.createElement("div", {
		className: R.panel,
		style: { padding: "6px 8px 8px" }
	}, /* @__PURE__ */ D.createElement("div", { className: R.head }, /* @__PURE__ */ D.createElement("span", {
		className: R.caption,
		title: Ee
	}, "Surface")), /* @__PURE__ */ D.createElement(t, {
		size: "sm",
		value: String(i),
		options: De,
		onChange: (e) => A().getState().setView(Oe(e))
	}), /* @__PURE__ */ D.createElement("div", null, ke.map((t) => /* @__PURE__ */ D.createElement("div", {
		key: t.key,
		title: t.tip
	}, /* @__PURE__ */ D.createElement(e, {
		label: t.label,
		value: t.read(a),
		min: t.range.min,
		max: t.range.max,
		step: t.range.step,
		defaultValue: t.defaultValue,
		onChange: (e) => I(M, { [t.key]: e }),
		onCommit: () => M.commit(t.label.toLowerCase())
	}))), /* @__PURE__ */ D.createElement("div", { title: "For photos where the subject is darker than what's behind it" }, /* @__PURE__ */ D.createElement(n, {
		label: "Invert (darker is nearer)",
		checked: a.invert,
		onChange: (e) => {
			I(M, { invert: e }), M.commit("invert");
		}
	}))), /* @__PURE__ */ D.createElement(H, {
		target: M,
		p: a,
		scope: null
	}));
}
function Me({ scope: e }) {
	let { maskId: t } = e;
	O.stores.useDevelopStore((e) => e.params.masks);
	let n = me(e);
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
		}, n = ge(e, t.u, t.v);
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
		style: { background: z(e) }
	}), /* @__PURE__ */ D.createElement("span", { className: R.name }, `Light ${t + 1}`), /* @__PURE__ */ D.createElement("button", {
		type: "button",
		title: "Delete light",
		"aria-label": `Delete Light ${t + 1}`,
		className: `${R.remove} ${R.reveal}`,
		onClick: (e) => {
			e.stopPropagation(), f(t);
		}
	}, "×")))) : /* @__PURE__ */ D.createElement("div", { className: R.hint }, "Lower Ambient to deepen the shadows, then add lights to bring light back where you want it."), m ? /* @__PURE__ */ D.createElement("div", { className: R.editor }, Ae.map((t) => /* @__PURE__ */ D.createElement(r, {
		key: t.key,
		label: t.label,
		value: t.read(m),
		min: t.range.min,
		max: t.range.max,
		step: t.range.step,
		defaultValue: t.defaultValue,
		trackBackground: t.track?.(m),
		onChange: (n) => F(e, l, { [t.key]: n }),
		onCommit: () => e.commit(`light ${t.label.toLowerCase()}`)
	})), /* @__PURE__ */ D.createElement("div", { className: R.hint }, "Drag the light on the photo to move it.")) : null);
}
function Ne() {
	M.write(i), M.commit("reset"), A().getState().select(-1);
}
//#endregion
//#region src/glsl.ts
function Pe(e) {
	let t = e.toPrecision(10);
	if (/e/i.test(t)) {
		let [e, n] = t.split(/e/i);
		return `${e.includes(".") ? e : `${e}.0`}e${Number(n)}`;
	}
	return t.includes(".") ? t : `${t}.0`;
}
var U = Pe;
function Fe(e) {
	return e === "linear" ? "vec3 rlInput(vec3 p) { return p; }" : "vec3 rlInput(vec3 p) {\n  vec3 a = abs(p);\n  return sign(p) * mix(a / 12.92, pow((a + 0.055) / 1.055, vec3(2.4)), step(0.04045, a));\n}";
}
var W = "precision highp int;", Ie = "\nfloat rlLevelRaw(float beta, int k) { return exp2(beta * float(4 - k)); }\nfloat rlSigmaUnits(int k) { return sqrt((exp2(2.0 * float(k) + 2.0) - 1.0) / 3.0); }\nfloat rlLevelWeight(int k) {\n  float beta = (detail - 50.0) / 50.0;\n  float sum = 0.0;\n  for (int j = 0; j < 9; j++) {\n    sum += rlLevelRaw(beta, j);\n  }\n  return rlLevelRaw(beta, k) / sum;\n}\nfloat rlSlopeWeight(int k) { return rlLevelWeight(k) * rlSigmaUnits(k) / exp2(float(k)); }\nfloat rlHeightWeight(int k) {\n  float beta = (detail - 50.0) / 50.0;\n  float sum = 0.0;\n  for (int j = 0; j < 9; j++) {\n    sum += rlLevelRaw(beta, j) * rlSigmaUnits(j);\n  }\n  return rlLevelRaw(beta, k) * rlSigmaUnits(k) / sum;\n}";
function Le(e) {
	return `${W}
${Fe(e)}
float rlB3(int d) { int a = d < 0 ? -d : d; return a == 0 ? ${U(n[2])} : (a == 1 ? ${U(n[1])} : ${U(n[0])}); }
float rlDB3(int d) { int a = d < 0 ? -d : d; float m = a == 0 ? 0.0 : (a == 1 ? ${U(r[3])} : ${U(r[4])}); return d < 0 ? -m : m; }
float rlLogLum(vec3 p) { return log2(max(luma(rlInput(p)), 0.0) + ${U(.00390625)}); }
${Ie}
`;
}
var Re = `
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
`, ze = `
vec3 rlNormal(float gx, float gy) {
  float d = (invert > 0.5 ? -1.0 : 1.0) * depth / ${U(25)};
  return normalize(vec3(-d * gx, -d * gy, 1.0));
}`, Be = `${W}
${ze}
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
`, Ve = "\n{\n  vec2 size = 1.0 / uTexel;\n  vec2 aspect = size / max(size.x, size.y);\n  vec3 n = rlNormal(c.g, c.b);\n  vec2 xy = vUv * aspect;\n  vec3 g = vec3(ambient * 0.01);\n  for (int i = 0; i < 4; i++) {\n    if (float(i) < lightCount && lightTone[i].x > 0.0) {\n      g += lightTone[i].x * 0.01 * rlShade(lightPlace[i], xy, aspect, n) * rlColour(lightTone[i]);\n    }\n  }\n  c = vec4(g, 1.0);\n}\n", He = `${W}
${ze}
float rlGrey(float h) {
  float g = clamp((h + 8.0) / 9.0, 0.0, 1.0);
  return invert > 0.5 ? 1.0 - g : g;
}
`, Ue = "\n{\n  vec3 n = rlNormal(c.g, c.b);\n  vec3 shown = view < 1.5 ? vec3(0.5 + 0.5 * n.x, 0.5 - 0.5 * n.y, 0.5 + 0.5 * n.z) : vec3(rlGrey(c.a));\n  c = vec4(shown, 1.0);\n}\n", We = "\nif (on > 0.5) {\n  lin *= lit > 0.5 ? max(stageResult, vec3(0.0)) : vec3(ambient * 0.01);\n}\n", Ge = "\nif (view > 0.5) {\n  c = stageResult;\n}\n", G = (e, t, n, r) => ({
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
}), Ke = {
	min: 0,
	max: 9,
	step: 1
}, q = {
	min: 0,
	max: 1,
	step: 1
}, qe = () => G("detail", i.detail, o.detail, "detail"), J = () => G("depth", i.depth, o.depth, "depth"), Y = () => G("invert", 0, q, "invert"), X = () => G("ambient", i.ambient, o.ambient, "ambient"), Je = () => G("levels", 0, Ke), Z = () => G("shade", 0, q);
function Ye(e) {
	return {
		glsl: Re,
		helpers: Le(e),
		channels: 4,
		iterations: {
			key: "levels",
			max: 9
		},
		uniforms: [qe(), Je()],
		keep: !0
	};
}
function Xe() {
	return [
		G("on", 0, q),
		G("lit", 0, q),
		X(),
		qe(),
		J(),
		Y(),
		G("lightCount", 0, {
			min: 0,
			max: 4,
			step: 1
		}),
		K("lightPlace"),
		K("lightTone"),
		Je(),
		Z()
	];
}
function Ze() {
	return {
		id: h,
		name: "Relight",
		phase: "scene-linear",
		priority: 65,
		glsl: We,
		uniforms: Xe(),
		passes: [Ye("linear"), {
			glsl: Ve,
			helpers: Be,
			channels: 4,
			iterations: {
				key: "shade",
				max: 1
			},
			uniforms: [
				J(),
				Y(),
				X(),
				G("lightCount", 0, {
					min: 0,
					max: 4,
					step: 1
				}),
				K("lightPlace"),
				K("lightTone"),
				Z()
			]
		}],
		presetScope: "global",
		dormantWhen: { on: 0 },
		mask: { maskable: !0 }
	};
}
function Qe() {
	return {
		id: g,
		name: "Relight surface view",
		phase: "output-encode",
		priority: 1e5,
		space: {
			encoding: "perceptual",
			primaries: "rec709"
		},
		glsl: Ge,
		uniforms: [G("view", 0, {
			min: 0,
			max: 2,
			step: 1
		})],
		passes: [Ye("perceptual"), {
			glsl: Ue,
			helpers: He,
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
				Z()
			]
		}],
		presetScope: "per-image",
		dormantWhen: { view: 0 }
	};
}
function $e() {
	return [Ze(), Qe()];
}
//#endregion
//#region src/view.ts
function et() {
	let e = "null", t = () => {
		let t = de(A().getState().view, w(O.stores.useDevelopStore.getState().paramBag)), n = JSON.stringify(t);
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
function tt(e) {
	fe(e), pe(), Q = e;
	for (let t of $e()) e.registerProcessingStage(t);
	e.registerStylesheet({
		id: be,
		css: we(e.ui.tokens)
	}), e.registerPanel({
		id: _,
		title: "Relight",
		component: V,
		defaultDock: {
			module: "develop",
			direction: "right",
			width: 268
		},
		onReset: Ne,
		mask: {
			component: V,
			owns: ae()
		}
	}), e.registerSlot({
		id: v,
		slot: "develop-canvas-overlay",
		component: Te
	}), $ = [e.stores.useDevelopStore.subscribe((e, t) => {
		if (e.paramBag === t.paramBag) return;
		let n = ce(e.paramBag);
		n && e.setDynParams(n);
	}), et()];
}
function nt() {
	let e = Q;
	if (e) {
		Q = null;
		try {
			for (let e of $) e();
			$ = [];
			for (let t of $e()) e.unregisterProcessingStage(t.id);
		} catch (e) {
			console.warn("[relight] deactivate failed:", e);
		}
	}
}
//#endregion
export { m as EXT_ID, _ as PANEL_ID, tt as activate, nt as deactivate };

//# sourceMappingURL=index.js.map
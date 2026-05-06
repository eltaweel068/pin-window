import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';

const PIN_ICON = 'view-pin-symbolic';
const OPACITY_MIN = 50;
const OPACITY_MAX = 255;
const toFraction = v => (v - OPACITY_MIN) / (OPACITY_MAX - OPACITY_MIN);
const fromFraction = f => Math.round(OPACITY_MIN + f * (OPACITY_MAX - OPACITY_MIN));

function formatAccel(accel) {
    if (!accel) return 'Disabled';
    // Convert e.g. '<Super><Shift>p' -> 'Super+Shift+P'
    const parts = [];
    const re = /<([^>]+)>/g;
    let m;
    let rest = accel;
    while ((m = re.exec(accel)) !== null) {
        let mod = m[1];
        if (mod === 'Primary') mod = 'Ctrl';
        parts.push(mod);
    }
    rest = accel.replace(/<[^>]+>/g, '');
    if (rest.length === 1) rest = rest.toUpperCase();
    if (rest) parts.push(rest);
    return parts.join('+');
}

const POSITIONS = [
    { id: 'top-left',     label: 'Top Left' },
    { id: 'top-center',   label: 'Top Center' },
    { id: 'top-right',    label: 'Top Right' },
    { id: 'left',         label: 'Left' },
    { id: 'center',       label: 'Center' },
    { id: 'right',        label: 'Right' },
    { id: 'bottom-left',  label: 'Bottom Left' },
    { id: 'bottom-center',label: 'Bottom Center' },
    { id: 'bottom-right', label: 'Bottom Right' },
];

function placeWindow(win, posId) {
    const monitor = win.get_monitor();
    const work = Main.layoutManager.getWorkAreaForMonitor(monitor);
    const r = win.get_frame_rect();
    const margin = 12;

    let x = work.x + margin;
    let y = work.y + margin;

    if (posId.includes('right'))
        x = work.x + work.width - r.width - margin;
    else if (posId.includes('center'))
        x = work.x + Math.floor((work.width - r.width) / 2);
    else if (posId === 'left' || posId === 'center')
        x = work.x + margin;

    if (posId.startsWith('top-'))
        y = work.y + margin;
    else if (posId.startsWith('bottom-'))
        y = work.y + work.height - r.height - margin;
    else
        y = work.y + Math.floor((work.height - r.height) / 2);

    if (posId === 'left')  { x = work.x + margin; y = work.y + Math.floor((work.height - r.height) / 2); }
    if (posId === 'right') { x = work.x + work.width - r.width - margin; y = work.y + Math.floor((work.height - r.height) / 2); }
    if (posId === 'center'){ x = work.x + Math.floor((work.width - r.width) / 2); y = work.y + Math.floor((work.height - r.height) / 2); }

    win.move_frame(true, x, y);
}

const PinIndicator = GObject.registerClass(
class PinIndicator extends PanelMenu.Button {
    _init(ext) {
        super._init(0.0, 'Pin Window');
        this._ext = ext;

        this._icon = new St.Icon({
            icon_name: PIN_ICON,
            style_class: 'system-status-icon pin-window-icon',
        });
        this.add_child(this._icon);

        this._toggleItem = new PopupMenu.PopupMenuItem('Pin focused window');
        this._toggleItem.connect('activate', () => ext.togglePinFocused());
        this.menu.addMenuItem(this._toggleItem);

        this._unpinAllItem = new PopupMenu.PopupMenuItem('Unpin all windows');
        this._unpinAllItem.connect('activate', () => ext.unpinAll());
        this.menu.addMenuItem(this._unpinAllItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const opacityItem = new PopupMenu.PopupBaseMenuItem({ activate: false });
        const opacityLabel = new St.Label({
            text: 'Default opacity',
            y_align: Clutter.ActorAlign.CENTER,
        });
        const initial = ext._settings.get_int('pin-opacity');
        this._opacitySlider = new Slider.Slider(toFraction(initial));
        this._opacityValue = new St.Label({
            text: `${Math.round((initial / 255) * 100)}%`,
            y_align: Clutter.ActorAlign.CENTER,
            style: 'min-width: 3em; text-align: right;',
        });
        this._opacitySlider.connect('notify::value', () => {
            const v = fromFraction(this._opacitySlider.value);
            ext._settings.set_int('pin-opacity', v);
            this._opacityValue.text = `${Math.round((v / 255) * 100)}%`;
        });
        opacityItem.add_child(opacityLabel);
        opacityItem.add_child(this._opacitySlider);
        opacityItem.add_child(this._opacityValue);
        this._opacitySlider.x_expand = true;
        this.menu.addMenuItem(opacityItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._pinnedSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._pinnedSection);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._hint = new PopupMenu.PopupMenuItem('', { reactive: false });
        this.menu.addMenuItem(this._hint);
        this._updateShortcutHint();

        this._shortcutId = ext._settings.connect('changed::toggle-pin',
            () => this._updateShortcutHint());

        this._focusId = global.display.connect('notify::focus-window', () => this._sync());

        this._menuOpenId = this.menu.connect('open-state-changed', (_m, open) => {
            if (open) this._rebuildPinnedSection();
        });

        this._sync();
    }

    _rebuildPinnedSection() {
        this._pinnedSection.removeAll();

        const pinned = this._ext._pinned ? [...this._ext._pinned] : [];
        if (pinned.length === 0) {
            const empty = new PopupMenu.PopupMenuItem('No pinned windows', { reactive: false });
            this._pinnedSection.addMenuItem(empty);
            return;
        }

        for (const win of pinned) {
            if (!win || typeof win.get_title !== 'function') continue;
            let title = win.get_title() || win.get_wm_class() || 'Window';
            if (title.length > 40) title = title.slice(0, 38) + '…';

            const sub = new PopupMenu.PopupSubMenuMenuItem(title);

            for (const pos of POSITIONS) {
                const item = new PopupMenu.PopupMenuItem(pos.label);
                item.connect('activate', () => {
                    try { placeWindow(win, pos.id); } catch (_) {}
                });
                sub.menu.addMenuItem(item);
            }

            sub.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            const winOpacity = this._ext._getOpacity(win);
            const opItem = new PopupMenu.PopupBaseMenuItem({ activate: false });
            const opLabel = new St.Label({
                text: 'Opacity',
                y_align: Clutter.ActorAlign.CENTER,
            });
            const opSlider = new Slider.Slider(toFraction(winOpacity));
            const opValue = new St.Label({
                text: `${Math.round((winOpacity / 255) * 100)}%`,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'min-width: 3em; text-align: right;',
            });
            opSlider.x_expand = true;
            opSlider.connect('notify::value', () => {
                const v = fromFraction(opSlider.value);
                this._ext._setOpacity(win, v);
                opValue.text = `${Math.round((v / 255) * 100)}%`;
            });
            opItem.add_child(opLabel);
            opItem.add_child(opSlider);
            opItem.add_child(opValue);
            sub.menu.addMenuItem(opItem);

            const hidden = this._ext._isHidden(win);
            const hideItem = new PopupMenu.PopupMenuItem(hidden ? 'Show' : 'Hide');
            hideItem.connect('activate', () => this._ext.toggleHide(win));
            sub.menu.addMenuItem(hideItem);

            const unpinItem = new PopupMenu.PopupMenuItem('Unpin');
            unpinItem.connect('activate', () => {
                this._ext._unpin(win);
                this._sync();
            });
            sub.menu.addMenuItem(unpinItem);

            this._pinnedSection.addMenuItem(sub);
        }
    }

    _updateShortcutHint() {
        const accels = this._ext._settings.get_strv('toggle-pin');
        const label = accels.length ? formatAccel(accels[0]) : 'Disabled';
        this._hint.label.text = `Shortcut: ${label}`;
    }

    _sync() {
        const win = global.display.focus_window;
        const focusedPinned = win && win.is_on_all_workspaces();
        this._toggleItem.label.text = focusedPinned ? 'Unpin focused window' : 'Pin focused window';

        const anyPinned = this._ext._pinned && this._ext._pinned.size > 0;
        if (anyPinned)
            this._icon.add_style_class_name('pin-window-active');
        else
            this._icon.remove_style_class_name('pin-window-active');
    }

    destroy() {
        if (this._focusId)
            global.display.disconnect(this._focusId);
        if (this._menuOpenId)
            this.menu.disconnect(this._menuOpenId);
        if (this._shortcutId)
            this._ext._settings.disconnect(this._shortcutId);
        super.destroy();
    }
});

export default class PinWindowExtension extends Extension {
    enable() {
        this._pinned = new Set();
        this._hidden = new Set();
        this._opacities = new Map();
        this._settings = this.getSettings();

        this._addIndicator();

        this._panelBoxId = this._settings.connect('changed::panel-box',
            () => this._addIndicator());
        this._panelIndexId = this._settings.connect('changed::panel-index',
            () => this._addIndicator());
        this._opacityId = this._settings.connect('changed::pin-opacity', () => {
            // Default-only; existing per-window opacities are preserved.
        });

        Main.wm.addKeybinding(
            'toggle-pin',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this.togglePinFocused()
        );
    }

    disable() {
        Main.wm.removeKeybinding('toggle-pin');

        if (this._settings) {
            if (this._panelBoxId) this._settings.disconnect(this._panelBoxId);
            if (this._panelIndexId) this._settings.disconnect(this._panelIndexId);
            if (this._opacityId) this._settings.disconnect(this._opacityId);
            this._panelBoxId = 0;
            this._panelIndexId = 0;
            this._opacityId = 0;
        }

        this.unpinAll();

        if (this._unmanagedIds) {
            for (const [win, id] of this._unmanagedIds) {
                try { win.disconnect(id); } catch (_) {}
            }
            this._unmanagedIds.clear();
            this._unmanagedIds = null;
        }

        this._indicator?.destroy();
        this._indicator = null;
        this._pinned = null;
        this._hidden = null;
        this._opacities = null;
        this._settings = null;
    }

    _addIndicator() {
        this._indicator?.destroy();
        this._indicator = new PinIndicator(this);
        const box = this._settings.get_string('panel-box');
        const index = this._settings.get_int('panel-index');
        Main.panel.addToStatusArea('pin-window', this._indicator, index, box);
    }

    togglePinFocused() {
        const win = global.display.focus_window;
        if (!win) return;

        if (win.is_on_all_workspaces()) {
            this._unpin(win);
        } else {
            this._pin(win);
        }
        this._indicator?._sync();
    }

    _pin(win) {
        if (!win.is_on_all_workspaces()) win.stick();
        if (typeof win.is_above === 'function' ? !win.is_above() : true) {
            try { win.make_above(); } catch (_) {}
        }
        this._pinned.add(win);
        if (!this._opacities.has(win))
            this._opacities.set(win, this._settings.get_int('pin-opacity'));
        this._applyOpacity(win, this._opacities.get(win));

        if (!this._unmanagedIds) this._unmanagedIds = new Map();
        if (!this._unmanagedIds.has(win)) {
            const id = win.connect('unmanaged', () => {
                this._pinned?.delete(win);
                this._hidden?.delete(win);
                this._opacities?.delete(win);
                this._unmanagedIds?.delete(win);
                this._indicator?._sync();
            });
            this._unmanagedIds.set(win, id);
        }

        this._indicator?._sync();
    }

    _unpin(win) {
        try {
            if (this._isHidden(win)) {
                win.unminimize();
                this._hidden.delete(win);
            }
            win.unstick();
            win.unmake_above();
        } catch (_) {}
        const unmanagedId = this._unmanagedIds?.get(win);
        if (unmanagedId) {
            try { win.disconnect(unmanagedId); } catch (_) {}
            this._unmanagedIds.delete(win);
        }
        this._applyOpacity(win, 255);
        this._pinned.delete(win);
        this._opacities?.delete(win);
        this._indicator?._sync();
    }

    _getOpacity(win) {
        if (this._opacities?.has(win)) return this._opacities.get(win);
        return this._settings.get_int('pin-opacity');
    }

    _setOpacity(win, value) {
        this._opacities?.set(win, value);
        this._applyOpacity(win, value);
    }

    _applyOpacity(win, value) {
        try {
            const actor = typeof win.get_compositor_private === 'function'
                ? win.get_compositor_private() : null;
            if (actor) actor.opacity = value;
        } catch (_) {}
    }

    _isHidden(win) {
        return this._hidden && this._hidden.has(win);
    }

    toggleHide(win) {
        try {
            if (this._isHidden(win)) {
                win.unminimize();
                win.activate(global.get_current_time());
                this._hidden.delete(win);
            } else {
                win.minimize();
                this._hidden.add(win);
            }
        } catch (_) {}
    }

    unpinAll() {
        if (!this._pinned) return;
        for (const win of [...this._pinned])
            this._unpin(win);
        this._hidden?.clear();
        this._opacities?.clear();
        this._indicator?._sync();
    }
}

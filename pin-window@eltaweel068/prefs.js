import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class PinWindowPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'view-pin-symbolic',
        });
        window.add(page);

        // ---- Panel placement ----
        const panelGroup = new Adw.PreferencesGroup({
            title: 'Panel indicator',
            description: 'Where the pin icon appears in the top panel.',
        });
        page.add(panelGroup);

        const boxRow = new Adw.ComboRow({
            title: 'Panel box',
            subtitle: 'Left, Center, or Right area of the top panel.',
            model: Gtk.StringList.new(['Left', 'Center', 'Right']),
        });
        const boxValues = ['left', 'center', 'right'];
        boxRow.selected = Math.max(0, boxValues.indexOf(settings.get_string('panel-box')));
        boxRow.connect('notify::selected', () => {
            settings.set_string('panel-box', boxValues[boxRow.selected]);
        });
        panelGroup.add(boxRow);

        const indexRow = new Adw.SpinRow({
            title: 'Position index',
            subtitle: '0 = first item in the box. Increase to push the icon further in.',
            adjustment: new Gtk.Adjustment({
                lower: 0, upper: 20, step_increment: 1, page_increment: 1,
                value: settings.get_int('panel-index'),
            }),
        });
        indexRow.connect('changed', () => {
            settings.set_int('panel-index', indexRow.get_value());
        });
        panelGroup.add(indexRow);

        // ---- Shortcut info ----
        const shortcutGroup = new Adw.PreferencesGroup({ title: 'Shortcut' });
        page.add(shortcutGroup);

        const formatAccel = () => {
            const accels = settings.get_strv('toggle-pin');
            if (!accels.length) return 'Disabled';
            const [ok, key, mods] = Gtk.accelerator_parse(accels[0]);
            if (!ok || !key) return accels[0];
            const safeMods = mods & Gtk.accelerator_get_default_mod_mask();
            return Gtk.accelerator_get_label(key, safeMods);
        };

        const shortcutRow = new Adw.ActionRow({
            title: 'Toggle pin on focused window',
            subtitle: 'Click to set a new shortcut.',
            activatable: true,
        });

        const shortcutLabel = new Gtk.Label({
            label: formatAccel(),
            css_classes: ['dim-label'],
            valign: Gtk.Align.CENTER,
        });
        shortcutRow.add_suffix(shortcutLabel);

        const clearBtn = new Gtk.Button({
            icon_name: 'edit-clear-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
            tooltip_text: 'Clear shortcut',
        });
        clearBtn.connect('clicked', () => {
            settings.set_strv('toggle-pin', []);
            shortcutLabel.label = formatAccel();
        });
        shortcutRow.add_suffix(clearBtn);

        shortcutRow.connect('activated', () => {
            const dialog = new Adw.MessageDialog({
                transient_for: window,
                modal: true,
                heading: 'Set shortcut',
                body: 'Press the new key combination, or Escape to cancel.',
            });

            const controller = new Gtk.EventControllerKey();
            dialog.add_controller(controller);
            controller.connect('key-pressed', (_c, keyval, _code, state) => {
                if (keyval === Gdk.KEY_Escape) {
                    dialog.close();
                    return Gdk.EVENT_STOP;
                }
                const mods = state & Gtk.accelerator_get_default_mod_mask();
                if (!mods && (keyval === Gdk.KEY_BackSpace || keyval === Gdk.KEY_Delete)) {
                    settings.set_strv('toggle-pin', []);
                    shortcutLabel.label = formatAccel();
                    dialog.close();
                    return Gdk.EVENT_STOP;
                }
                // Allow Super-only modifier combos (e.g. Super+P), which
                // Gtk.accelerator_valid rejects for plain letter keys.
                const SUPER = Gdk.ModifierType.SUPER_MASK;
                const hasSuper = (mods & SUPER) !== 0;
                if (!hasSuper && !Gtk.accelerator_valid(keyval, mods))
                    return Gdk.EVENT_STOP;
                if (!mods) return Gdk.EVENT_STOP;
                const accel = Gtk.accelerator_name(keyval, mods);
                if (!accel) return Gdk.EVENT_STOP;
                settings.set_strv('toggle-pin', [accel]);
                shortcutLabel.label = formatAccel();
                dialog.close();
                return Gdk.EVENT_STOP;
            });

            dialog.present();
        });

        settings.connect('changed::toggle-pin', () => {
            shortcutLabel.label = formatAccel();
        });

        shortcutGroup.add(shortcutRow);
    }
}

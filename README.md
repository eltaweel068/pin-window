# Pin Window

![License: GPL-2.0](https://img.shields.io/badge/License-GPL--2.0-blue.svg)
![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-45%20%E2%80%93%2050-4A86CF.svg)
![Platform](https://img.shields.io/badge/Platform-Linux-orange.svg)

Pin the focused window to all workspaces and keep it always on top. Useful for browser picture-in-picture windows, video popups, chat windows, and any window you want to keep visible while you work.

---

## Demo

[▶ Watch the demo video](./pin-window-demo.mp4)

![Pin Window icon](./pin-window-icon.png)

---

## Features

- **Pin / unpin** the focused window with `Control+Super+Z` or from the panel menu
- **Always on top** — pinned windows float above all normal windows
- **All workspaces** — pinned windows follow you as you switch workspaces
- **9 snap positions** — move a pinned window to any corner, edge, or center with one click:
  `Top Left` · `Top Center` · `Top Right`
  `Left` · `Center` · `Right`
  `Bottom Left` · `Bottom Center` · `Bottom Right`
- **Opacity control** — set a default opacity for all pinned windows, or adjust each one individually
- **Hide / Show** — minimize a pinned window without unpinning it, then bring it back instantly
- **Unpin one or all** — remove a single window from the pinned list, or clear everything at once
- **Panel indicator** — pin icon in the top bar glows blue when windows are pinned
- **Preferences** — choose which panel area shows the icon, set its position index, and change or clear the keyboard shortcut

---

## Install

### From GNOME Extensions

Install directly from the browser:

1. Install the [GNOME Shell integration browser extension](https://gnome.org/apps/org.gnome.Extensions/)
2. Visit the Pin Window page on [extensions.gnome.org](https://extensions.gnome.org/extension/9878/pin-window/)
3. Toggle the switch to install

### From Source

```bash
git clone https://github.com/eltaweel068/pin-window.git
cd pin-window
bash install.sh
```

Then enable the extension:

```bash
gnome-extensions enable pin-window@eltaweel068
```

> **Wayland note:** log out and log back in after installing or updating the extension.

---

## Usage

1. Focus the window you want to keep visible.
2. Press `Control+Super+Z` to pin it.
3. Click the pin icon in the top panel to open the menu.
4. From the menu you can:
   - Move the window to any of the 9 snap positions
   - Adjust its opacity
   - Hide or show it
   - Unpin it

Press `Control+Super+Z` again while the same window is focused to unpin it.

---

## Preferences

Open the GNOME Extensions app, find **Pin Window**, and click **Settings**.

| Setting | Description |
|---|---|
| Panel box | Where the indicator appears: Left, Center, or Right of the top panel |
| Position index | `0` = first slot in that panel area; increase to push it further in |
| Shortcut | Click to set a new key combination; click the clear button to disable it |


---

## Why I Built This

I wanted a simple native **"Pin to Top"** option for browser popup windows — specifically a YouTube video popup that should stay visible while I switch workspaces or work on other things.

I opened a feature request in Brave Browser:

> <https://github.com/brave/brave-browser/issues/53600>

The issue did not get attention, so I built this GNOME Shell extension instead.

---

## Project Structure

```
.
├── pin-window-demo.mp4
├── install.sh
├── pin-window-icon.png
├── README.md
└── pin-window@eltaweel068/
    ├── extension.js
    ├── prefs.js
    ├── metadata.json
    ├── stylesheet.css
    └── schemas/
        └── org.gnome.shell.extensions.pin-window.gschema.xml
```

---

## Privacy

Pin Window does not collect data, send network requests, or use remote code. It only interacts with GNOME Shell window objects on your local desktop.

---

## Known Limitations

- Window stacking behavior varies between apps and compositors — some apps may override it
- On Wayland, extension updates require logging out and back in
- `shell-version` support follows GNOME releases; each new major version needs testing before being declared supported

---

## Contributing

Bug reports, ideas, and pull requests are welcome.

If something does not work on your GNOME version, distribution, or application, open a GitHub issue. The bug report form will ask for:

- GNOME Shell version (`gnome-shell --version`)
- Linux distribution
- Wayland or X11 session
- The application or window you tried to pin
- What happened vs. what you expected

Feature ideas are especially welcome if they improve the picture-in-picture or small popup window workflow.

---

## License

[GPL-2.0](LICENSE)

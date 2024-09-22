# Helpful links

* https://gjs.guide/extensions/development/creating.html
* https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/screenShield.js

## Testing

Start a nested gnome-shell session with multiple monitors:
```bash
env MUTTER_DEBUG_NUM_DUMMY_MONITORS=2 MUTTER_DEBUG_DUMMY_MODE_SPECS=1440x768 dbus-run-session -- gnome-shell --nested --wayland
```
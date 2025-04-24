## Multi Monitor Login and Top-Panel Fix

In gnome-shell, the login&unlock dialogs and the top-panel are always placed on the primary monitor. This extension moves the UI to the monitor the mouse is currently on **and** adds a visual clone on the other monitors.

## See it in action

![multi-monitor-login](https://github.com/user-attachments/assets/8e2f1e40-2062-45f5-8463-5ef16aee2e30)

## Installation

> These instructions have been tested on Ubuntu 24.04. 

As of September 2024, to enable extensions for gdm:
1. the extension **must** be installed in `/usr/share/gnome-shell/extensions/` (depends on your distribution)
2. it has to be enabled:
    ```bash
    sudo machinectl shell gdm@ /bin/bash
    dconf reset -f /
    gsettings set org.gnome.shell enabled-extensions "['multi-monitor-login@derflocki.github.com']"
    ```

## Known Problems

**Sometimes** when the monitors change while the computer is suspended (e.g when removing from the dock) the cloned top-bar stays visible over the 

## Acknowledgement

Thanks [PRATAP-KUMAR](https://github.com/PRATAP-KUMAR), Florian Müllner and everyone else who helped document [How to enable extension for the gdm user?](https://discourse.gnome.org/t/how-to-enable-extension-for-the-gdm-user/18140).

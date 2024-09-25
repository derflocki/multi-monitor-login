# Installation

> These instructions have been tested on Ubuntu 24.04. 

As of September 2024, to enable extensions for gdm:
1. the extension **must** be installed in `/usr/share/gnome-shell/extensions/` (depends on your distribution)
2. it has to be enabled:
    ```bash
    sudo machinectl shell gdm@ /bin/bash
    dconf reset -f /
    gsettings set org.gnome.shell enabled-extensions "['multi-monitor-login@derflocki.github.com']"
    ```

## Acknowledgement

Thanks [PRATAP-KUMAR](https://github.com/PRATAP-KUMAR), Florian Müllner and everyone else who helped document [How to enable extension for the gdm user?](https://discourse.gnome.org/t/how-to-enable-extension-for-the-gdm-user/18140).  
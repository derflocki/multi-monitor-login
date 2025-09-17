import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import {getPointerWatcher} from 'resource:///org/gnome/shell/ui/pointerWatcher.js';
import * as Layout from 'resource:///org/gnome/shell/ui/layout.js';
import * as LoginManager from 'resource:///org/gnome/shell/misc/loginManager.js';

export {MultiMonitorLogin};

const MultiMonitorLogin = class {
    monitorsChangedSignalId = null;
    /** @type {number}*/
    lastMonitorIndex = -1;

    //track Mouse
    pointerWatcherRef = null;

    //lastFoundActor
    actor = null;
    infos = [];
    panelClones = [];

    /** @type {number}*/
    suspendListenerId = undefined;

    /** @type LoginManager */
    loginManager = null;

    /**
     *
     * @param {number} mouse_x
     * @param {number} mouse_y
     * @returns {number}
     */
    getMonitorAtPosition(mouse_x, mouse_y) {
        let monitor = Main.layoutManager.monitors.filter(m => {
            return (m.x <= mouse_x) && (mouse_x <= m.x + m.width) &&
                (m.y <= mouse_y) && (mouse_y <= m.y + m.height);
        });
        if (monitor.length == 1) {
            return monitor[0].index;
        }
        return -1;
    }

    reinitPanel() {
        if (this.settings.get_boolean("clone-panel")) {
            this.setupPanelClones();
            let [x, y] = global.get_pointer();
            let currentIndex = this.getMonitorAtPosition(x, y);
            this.log(this.lastMonitorIndex + " - " + x + ", " + y + " @ " + currentIndex + " - initial");
            this.updatePanelClones(currentIndex);
        }
    }

    enable(settings) {
        this.settings = settings;
        //settings.connect('changed', this._changed.bind(this));
        this.lastMonitorIndex = -1;
        this.monitorsChangedSignalId = Main.layoutManager.connect('monitors-changed', this._monitors_changed.bind(this));
        this.setupMouseTracking(settings);

        this.loginManager = LoginManager.getLoginManager();
        if (this.LoginManager) {
            // Connect to the 'prepare-for-sleep' signal
            this.suspendListenerId = this.loginManager.connect('prepare-for-sleep', (lm, aboutToSuspend) => {
                this.log("reinitPanel after 'prepare-for-sleep', aboutToSuspend:" + aboutToSuspend)
                this.reinitPanel();
            });
        }
        this.reinitPanel();
        Main.sessionMode.connect('updated', () => this._sessionUpdated());
        this._sessionUpdated();
    }

    /**
     * Tracks the state of the session, sessionMode.isLocked, sessionMode.isGreeter
     * @private
     */
    _sessionUpdated() {
        //if we are in greeter mode or the session is locked, search for the relevant actor to clone
        if (Main.sessionMode.isLocked || Main.sessionMode.isGreeter) {
            this.startLooking();
        } else {
            this.reinitPanel();
        }
    }

    lock() {
        this.log("Locked!")
        this.startLooking();
    }

    startLooking() {
        let countLooksRemaining = 10;
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500,
            () => {
                this.log("Looking for actor...");
                if (this.actor) {
                    //previous iteration found actor but is not properly setup yet
                    return GLib.SOURCE_REMOVE;
                }
                this.actor = this.findActor();
                if (this.actor !== null) {
                    this.log("Found actor");
                    this.destroyId = this.actor.connect('destroy', () => {
                        this.actor = null;
                        this.destroyId = null;
                        this.removeInfos();
                    });

                    this.setupInfo();
                    this.updateActors(this.lastMonitorIndex);
                    this.log("Stop Looking for actor...");
                    return GLib.SOURCE_REMOVE;
                }
                countLooksRemaining--;
                this.log("Remaining iterations :" + countLooksRemaining);
                if (countLooksRemaining < 0) {
                    this.log("Stop Looking for actor...");
                    return GLib.SOURCE_REMOVE;
                }
                return GLib.SOURCE_CONTINUE;
            });
    }

    /**
     * This extension moves the unlock dialog to the Monitor the user clicks
     */
    disable() {
        Main.layoutManager.disconnect(this.monitorsChangedSignalId);
        this.log("disable");

        //stop Tracking the mouse
        if (this.pointerWatcherRef) {
            this.pointerWatcherRef.remove();
        }
        this.removeInfos();
        this.removePanelClones();
        if (this.destroyId) {
            this.actor.disconnect(this.destroyId);
        }
        this.actor = null;
        // Disconnect our signal listener
        if (this.suspendListenerId !== undefined) {
            this.loginManager.disconnect(suspendListenerId);
            this.loginManager = null;
            this.suspendListenerId = undefined;
        }
        this.log("disable complete");
    }

    removePanelClones() {
        this.panelClones.forEach((panelClone) => {
            Main.layoutManager.removeChrome(panelClone);
        })
        this.panelClones = [];
    }

    removeInfos() {
        //remove the Info Labels
        this.infos.forEach((l) => {
            Main.uiGroup.remove_child(l);
        });
        this.infos = [];
    }

    _monitors_changed() {
        this.log("_monitors_changed");
        this.setupInfo();
        if (this.settings.get_boolean("clone-panel")) {
            this.setupPanelClones();
            this.updatePanelClones(this.lastMonitorIndex)
        }
        this.updateActors(this.lastMonitorIndex);
    }

    setupMouseTracking(settings) {
        let pointerWatcher = getPointerWatcher();
        this.pointerWatcherRef = pointerWatcher.addWatch(100, (x, y) => {
            let currentIndex = this.getMonitorAtPosition(x, y);
            //this.log(this.lastMonitorIndex + " - " + x + ", " + y + " @ " + currentIndex);
            if (currentIndex == -1) {
                return;
            }
            //are we on another monitor?
            if (
                (currentIndex !== this.lastMonitorIndex)
            ) {
                this.log("Trigger monitor-id change");
                settings.set_int('monitor-id', currentIndex);
                this._changed(this.settings, 'monitor-id');
            }
        });
    }

    /**
     * Move the relevant Actors on the current screen
     * @param {Monitor} current - The title of the book.
     * @param {Monitor} last - The author of the book.
     */
    updateActors(monitorIndex) {
        if (this.infos.length == 0) {
            this.setupInfo();
        }
        if (this.infos[this.lastMonitorIndex]) {
            this.infos[this.lastMonitorIndex].show();
            this.infos[monitorIndex].hide();
        }
        if (this.actor) {
            this.moveActor(this.actor, monitorIndex);
        } else {
            this.log("got no actor to move")
        }
    }

    findActor() {
        this.log("looking for actor: [\"unlock-dialog\", \"login-dialog\"] in " + global.stage);
        let actor = this.findStyleClassRecursive(global.stage, ["unlock-dialog", "login-dialog"]);
        if (!actor) {
            return null;
        }
        let final = [actor, ...actor.get_children()].filter((child) => {
            //this.log("multi checking constraints: " + child);
            if (child.styleClass === "multi-mon-login-Info") {
                return false;
            }
            return child.get_constraints().some((constraint) => {
                return (constraint instanceof Layout.MonitorConstraint);
            });
        });
        this.log("got an actor: " + final[0]);
        return final[0];
    }

    /**
     *
     * @param {Clutter.Actor} rootActor
     * @param {array} styleClasses
     */
    findStyleClassRecursive(rootActor, styleClasses) {
        //this.log("checking actor: " + rootActor);
        //this.log("checking actor.styleClass: " + rootActor.styleClass);
        if (styleClasses.includes(rootActor.styleClass)) {
            return rootActor;
        }
        let actor = null;
        let children = rootActor.get_children();
        //this.log("checking actor.children.length: " + children.length);
        for (let i = 0; i < children.length; i++) {
            //this.log("checking child: " + i);
            actor = this.findStyleClassRecursive(children[i], styleClasses);
            if (actor) {
                return actor;
            }
        }
        return null;
    }

    moveActor(_dialog, monitorIndex) {
        if ((monitorIndex >= Main.layoutManager.monitors.length) || (monitorIndex < 0)) {
            this.log("multi invalid monitorIndex: " + monitorIndex);
            return;
        }
        this.log("multi _dialog: " + _dialog);
        let children = _dialog.get_children();
        _dialog.get_constraints().forEach((constraint) => {
            if (constraint instanceof Layout.MonitorConstraint) {
                //this.log("multi ClutterConstraint: " + constraint);
                constraint.index = monitorIndex;
            }
        });
    }

    _changed(settings, key) {
        this.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx - changed settings")
        if (key == 'monitor-id') {
            let newMonitor = this.settings.get_int('monitor-id');
            this.log("New Monitor: " + newMonitor + " (old: " + this.lastMonitorIndex + ")");
            if (this.settings.get_boolean("clone-panel")) {
                this.updatePanelClones(newMonitor);
            }
            this.updateActors(newMonitor);
            this.lastMonitorIndex = newMonitor;
        }
    }

    log(message) {
        console.log("multi-monitor-login@derflocki.github.com: " + message);
    }

    setupPanelClones() {
        this.log("setupPanelClones");
        for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
            let panelClone = null;
            let monitor = Main.layoutManager.monitors[i];
            if (this.panelClones[i]) {
                panelClone = this.panelClones[i];
            } else {
                panelClone = new Clutter.Clone({
                        source: Main.layoutManager.panelBox,
                        reactive: true
                    }
                );
                this.panelClones[i] = panelClone;
                Main.layoutManager.addChrome(panelClone, {
                    affectsStruts: true,
                    trackFullscreen: true
                });
            }
            panelClone.set_position(monitor.x, monitor.y);
            panelClone.set_size(monitor.width, -1);
        }
    }

    updatePanelClones(monitorIndex) {
        this.log("updatePanelClones to monitor " + monitorIndex);
        //move the actual panel to the current screen
        for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
            let monitor = Main.layoutManager.monitors[i];
            let panelClone = this.panelClones[i];
            if (!panelClone) {
                this.log("there is no clone for monitor " + i);
                continue;
            }
            let cloneHasParent = !!panelClone.get_parent();
            //we are processing the new "primary screen"
            if (i === monitorIndex) {
                this.log('we are processing the new "primary" screen:' + i);
                //hide the panelClone
                if (cloneHasParent) {
                    this.log("hide clone since it is on the primary monitor:" + i);
                    Main.layoutManager.removeChrome(panelClone);
                }

                //"move" the actual panel to this monitor
                Main.layoutManager.panelBox.set_position(monitor.x, monitor.y);
                //TODO: maybe don't enlarge. If you have a big difference in screen sizes it look ugly
                Main.layoutManager.panelBox.set_size(monitor.width, -1);
                if (monitor.inFullscreen) {
                    Main.layoutManager.panelBox.hide();
                } else {
                    Main.layoutManager.panelBox.show();
                }
            } else {
                this.log("show clone since it is on a non primary monitor:" + i);
                if (!cloneHasParent) {
                    Main.layoutManager.addChrome(panelClone, {
                        affectsStruts: true,
                        trackFullscreen: true
                    });
                }
            }
        }
        if (this.panelClones.length > Main.layoutManager.monitors.length) {
            this.log("There are more clones than monitors");
            //we habe more panel clones than monitors
            //remove them from the stage
            for (let i = Main.layoutManager.monitors.length; i < this.panelClones.length; i++) {
                let panelClone = this.panelClones[i];
                Main.layoutManager.removeChrome(panelClone);
                this.panelClones[i] = null;
            }
            //reduce the array to the number of monitors
            this.panelClones = this.panelClones.slice(0, Main.layoutManager.monitors.length)
        }
    }

    setupInfo() {
        if (!this.actor) {
            return;
        }
        for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
            //info already setup
            if (this.infos[i]) {
                continue;
            }
            this.log("Creating Clone for " + i);
            let clone = new Clutter.Clone({source: this.actor});
            clone.add_constraint(new Layout.MonitorConstraint({index: i}));
            this.infos[i] = clone;
            Main.uiGroup.add_child(clone);
        }
    }
};

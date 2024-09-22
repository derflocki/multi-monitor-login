import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import {getPointerWatcher} from 'resource:///org/gnome/shell/ui/pointerWatcher.js';
import * as Layout from 'resource:///org/gnome/shell/ui/layout.js';
export {MultiMonitorLogin};

const MultiMonitorLogin = class {
    /**
     * The complete Triforce, or one or more components of the Triforce.
     * @typedef {Object} Monitor
     * @property {int} index - Indicates whether the Wisdom component is present.
     * @property {int} x - Indicates whether the Courage component is present.
     * @property {int} y - Indicates whether the Power component is present.
     * @property {int} width - Indicates whether the Wisdom component is present.
     * @property {int} height - Indicates whether the Wisdom component is present.
     * @property {int} geometry_scale - Indicates whether the Wisdom component is present.
     */
    /** @type {Monitor}*/
    lastMonitorIndex = -1;

    //track Mouse
    pointerWatcherRef = null;

    //lastFoundActor
    actor = null;

    /**
     *
     * @param {int} mouse_x
     * @param {int} mouse_y
     * @private
     */
    _trackMouse(mouse_x, mouse_y) {
        /** @type {Monitor}*/
        let current = this.getMonitorAtPosition(mouse_x, mouse_y);
        if (!current) {
            return -1;
        }
        return current.index;
    };

    /**
     *
     * @param {int} mouse_x
     * @param {int} mouse_y
     * @returns {undefined|Monitor}
     */
    getMonitorAtPosition(mouse_x, mouse_y) {
        let monitor = Main.layoutManager.monitors.filter(m => {
            return (m.x <= mouse_x) && (mouse_x <= m.x + m.width) &&
                (m.y <= mouse_y) && (mouse_y <= m.y + m.height);
        });
        if (monitor.length == 1) {
            return monitor[0];
        }
        return undefined;
    }

    enable(settings) {
        settings.connect('changed', this._changed.bind(this))
        this.lastMonitorIndex = settings.get_int('monitor-id');
        console.log("multi-monitor-login@derflocki.github.com enable");
        let pointerWatcher = getPointerWatcher();
        this.pointerWatcherRef = pointerWatcher.addWatch(500, (x, y) => {
            let current = this._trackMouse(x, y);
            //are we on another monitor?
            if (
                (current === this.lastMonitorIndex) || (current === -1)
            ) {
                return;
            }
            settings.set_int('monitor-id', current);
        });
        this.addKeybinding(settings);
        console.log("multi-monitor-login@derflocki.github.com enable complete");
    }
    addKeybinding(settings) {
        //add the cycle keybinding
        Main.wm.addKeybinding('monitor-shortcut-cycle',
            settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.ALL,
            () => {
                let nextMonitor = (this.lastMonitorIndex + 1) % Main.layoutManager.monitors.length;
                //console.log("multi-monitor-login@derflocki.github.com: currentMonitor: " + this.lastMonitorIndex);
                //console.log("multi-monitor-login@derflocki.github.com: nextMonitor: " + nextMonitor);
                settings.set_int('monitor-id', nextMonitor);
            }
        );
        for(let i= 1; i <= 9; i++) {
            //console.log("multi-monitor-login@derflocki.github.com: 'monitor-shortcut-" + i + "'");
            Main.wm.addKeybinding('monitor-shortcut-' + i,
                settings,
                Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                Shell.ActionMode.ALL,
                () => settings.set_int('monitor-id', i-1)
            );
        }
    }

    /**
     * This extension moves the unlock dialog to the Monitor the user clicks
     */
    disable() {
        Main.wm.removeKeybinding('monitor-shortcut-cycle');
        for(let i= 1; i <= 9; i++) {
            Main.wm.removeKeybinding('monitor-shortcut-' + i);
        }
        this.actor = null;
        console.log("multi-monitor-login@derflocki.github.com disable");
        if (this.pointerWatcherRef) {
            this.pointerWatcherRef.remove();
        }
        console.log("multi-monitor-login@derflocki.github.com disable complete");
    }

    /**
     * Move the relevant Actors on the current screen
     * @param {Monitor} current - The title of the book.
     * @param {Monitor} last - The author of the book.
     */
    updateActors(monitorIndex) {
        if(this.actor === null) {
            console.log("looking for  actor: [\"unlock-dialog\", \"login-dialog\"] in " + global.stage);
            let actor = this.findStyleClassRecursive(global.stage, ["unlock-dialog", "login-dialog"]);
            if (!actor) {
                return;
            }
            console.log("got an actor: " + actor);
            this.actor = actor;
        }
        this.moveActor(this.actor, monitorIndex);
    }

    /**
     *
     * @param {}Clutter.Actor} rootActor
     * @param {array} styleClasses
     */
    findStyleClassRecursive(rootActor, styleClasses) {
        //console.log("checking actor: " + rootActor);
        //console.log("checking actor.styleClass: " + rootActor.styleClass);
        if(styleClasses.includes(rootActor.styleClass)) {
            return rootActor;
        }
        let actor = null;
        let children = rootActor.get_children();
        //console.log("checking actor.children.length: " + children.length);
        for(let i=0; i < children.length; i++) {
            //console.log("checking child: " + i);
            actor = this.findStyleClassRecursive(children[i], styleClasses);
            if(actor) {
                return actor;
            }
        }
        return null;
    }
    moveActor(_dialog, monitorIndex) {
        if((monitorIndex >= Main.layoutManager.monitors.length) || (monitorIndex < 0)) {
            console.log("multi-monitor-login@derflocki.github.com: invalid monitorIndex: " + monitorIndex);
            return;
        }
        //console.log("multi-monitor-login@derflocki.github.com: _dialog: " + _dialog);
        let children =  _dialog.get_children();
        [_dialog, ...children].forEach((child) => {
            //console.log("multi-monitor-login@derflocki.github.com: checking constraints: " + child);
            child.get_constraints().forEach((constraint) => {
                if(constraint instanceof Layout.MonitorConstraint) {
                    //console.log("multi-monitor-login@derflocki.github.com: ClutterConstraint: " + constraint);
                    constraint.index = monitorIndex;
                }
            });
        });
    }
    _changed(settings, key) {
        if(key == 'monitor-id') {
            let newMonitor= settings.get_int('monitor-id');
            console.log("New Monitor: " + newMonitor + " (old: " + this.lastMonitorIndex + ")");
            this.updateActors(newMonitor);
            this.lastMonitorIndex = newMonitor;
        }
    }
};
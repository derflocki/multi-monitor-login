import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
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
    infos = [];

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

    enable(settings) {
        console.log("multi-monitor-login@derflocki.github.com enable");
        settings.connect('changed', this._changed.bind(this))
        this.lastMonitorIndex = settings.get_int('monitor-id');
        this.setupInfo(settings);
        this.updateActors(this.lastMonitorIndex);
        this.setupMouseTracking(settings);
        this.setupKeybinding(settings);
        console.log("multi-monitor-login@derflocki.github.com enable complete");
    }

    /**
     * This extension moves the unlock dialog to the Monitor the user clicks
     */
    disable() {
        console.log("multi-monitor-login@derflocki.github.com disable");
        //remove keyBindings
        Main.wm.removeKeybinding('monitor-shortcut-cycle');
        for(let i= 1; i < 10; i++) {
            Main.wm.removeKeybinding('monitor-shortcut-' + i);
        }

        //stop Tracking the mouse
        if (this.pointerWatcherRef) {
            this.pointerWatcherRef.remove();
        }
        //remove the Info Labels
        this.infos.forEach((l) => {
            Main.uiGroup.remove_child(l);
        });
        this.actor = null;
        console.log("multi-monitor-login@derflocki.github.com disable complete");
    }
    setupMouseTracking(settings) {
        let pointerWatcher = getPointerWatcher();
        this.pointerWatcherRef = pointerWatcher.addWatch(100, (x, y) => {
            let currentIndex = this.getMonitorAtPosition(x, y);
            //are we on another monitor?
            if (
                (currentIndex === this.lastMonitorIndex) || (currentIndex === -1)
            ) {
                return;
            }
            settings.set_int('monitor-id', currentIndex);
        });
    }

    setupKeybinding(settings) {
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
        for(let i= 1; i < 10; i++) {
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
     * Move the relevant Actors on the current screen
     * @param {Monitor} current - The title of the book.
     * @param {Monitor} last - The author of the book.
     */
    updateActors(monitorIndex) {
        if(this.infos.length == 0) {
            this.setupInfo();
        }
        if(this.infos.length != 0) {
            this.infos[this.lastMonitorIndex].show();
            this.infos[monitorIndex].hide();
        }
        let actor = this.findActor();
        if(!actor) {
            return;
        }
        this.moveActor(actor, monitorIndex);
    }
    findActor() {
        if(this.actor === null) {
            console.log("looking for actor: [\"unlock-dialog\", \"login-dialog\"] in " + global.stage);
            let actor = this.findStyleClassRecursive(global.stage, ["unlock-dialog", "login-dialog"]);
            if (!actor) {
                return null;
            }
            let final = [actor, ...actor.get_children()].filter((child) => {
                //console.log("multi-monitor-login@derflocki.github.com: checking constraints: " + child);
                if(child.styleClass === "multi-mon-login-Info") {
                    return false;
                }
                return child.get_constraints().some((constraint) => {
                    return(constraint instanceof Layout.MonitorConstraint);
                });
            });
            console.log("got an actor: " + final[0]);
            this.actor = final[0];
        }
        return this.actor;
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
        _dialog.get_constraints().forEach((constraint) => {
            if(constraint instanceof Layout.MonitorConstraint) {
                //console.log("multi-monitor-login@derflocki.github.com: ClutterConstraint: " + constraint);
                constraint.index = monitorIndex;
            }
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

    setupInfo(settings) {
        let promptActor = this.findActor();
        if(!promptActor) {
            return;
        }
        for(let i= 0; i < Main.layoutManager.monitors.length; i++) {
            let clone = new Clutter.Clone({source: promptActor});
            clone.add_constraint(new Layout.MonitorConstraint({index: i}));
            clone.styleClass = 'multi-mon-login-Info';
            this.infos.push(clone);
            Main.uiGroup.add_child(clone);
            //let text = "The Login-Prompt will follow your mouse.\n\n"
            //    + "Press <span foreground='white' font='monospace' weight='bold'>Ctrl+a</span> to move it to the next monitor.\n"
            //    + "Press <span foreground='white' font='monospace' weight='bold'>Ctrl+" + (i+1) +"</span> to switch to this monitor.\n"
            //;
            //let label = new St.Label({
            //    style_class: 'multi-mon-login-Info',
            //    x_align: Clutter.ActorAlign.CENTER,
            //    y_align: Clutter.ActorAlign.CENTER,
            //    x_expand: true,
            //    y_expand: true,
            //});
            //label.clutter_text.set_markup(text);
            //label.add_constraint(new Layout.MonitorConstraint({index: i}));
            //this.infos.push(label);
            //Main.uiGroup.add_child(label);
        }
    }
};
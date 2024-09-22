import * as Main from 'resource:///org/gnome/shell/ui/main.js';
//import {Monitor} from 'resource:///org/gnome/shell/ui/layout.js';
import {getPointerWatcher} from 'resource:///org/gnome/shell/ui/pointerWatcher.js';

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
    lastMonitor = {index: -1, x: 0, y: 0, width: 0, height: 0, geometry_scale: 0};

    pointerWatcherRef;

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
            return;
        }
        //are we on another monitor?
        if ((current.x === this.lastMonitor.x) &&
            (current.y === this.lastMonitor.y) &&
            (current.width === this.lastMonitor.width) &&
            (current.height === this.lastMonitor.height) &&
            (current.index === this.lastMonitor.index)
        ) {
            return;
        }
        console.log("New Monitor!!!");
        console.log(JSON.stringify(current));
        console.log(JSON.stringify(this.lastMonitor));

        //move the relevant actor ot the current monitor
        this.updateActors(current, this.lastMonitor);
        this.lastMonitor = current;
    };

    /**
     *
     * @param {int} mouse_x
     * @param {int} mouse_y
     * @returns {undefined|Monitor}
     */
    getMonitorAtPosition(mouse_x, mouse_y) {
        let monitor = Main.layoutManager.monitors.filter(m => {
            return (m.x < mouse_x) && (mouse_x < m.x + m.width) &&
                (m.y < mouse_y) && (mouse_y < m.y + m.height);
        });
        if (monitor.length == 1) {
            return monitor[0];
        }
        return undefined;
    }

    enable() {
        this.lastMonitor = {x: 0, y: 0, width: 0, height: 0};
        console.log("multi-monitor-login@derflocki.github.com enable");
        let pointerWatcher = getPointerWatcher();
        this.pointerWatcherRef = pointerWatcher.addWatch(100, (x, y) => {
            this._trackMouse(x, y);
        });
        console.log("multi-monitor-login@derflocki.github.com enable complete");
    }

    /**
     * This extension moves the unlock dialog to the Monitor the user clicks
     */
    disable() {
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
    updateActors(current, last) {
        console.log("multi-monitor-login@derflocki.github.com: New Monitor " + JSON.stringify(current));

        let actor = this.findStyleClassRecursive(global.stage, ["unlock-dialog", "login-dialog"]);
        if(!actor) {
            return;
        }
        this.moveActor(actor, current);
        //The Lock screen
        //Main.screenShield: https://github.com/GNOME/gnome-shell/blob/main/js/ui/screenShield.js
        //if ((Main.screenShield && Main.screenShield._dialog)) {
        //    //Main.screenShield._dialog: https://github.com/GNOME/gnome-shell/blob/main/js/ui/unlockDialog.js
        //    this.moveActor(Main.screenShield._dialog, current)
        //}
        //styleClass: "unlock-dialog"
        //styleClass: "login-dialog"
        //global.stage
    }

    /**
     *
     * @param {}Clutter.Actor} rootActor
     * @param {array} styleClasses
     */
    findStyleClassRecursive(rootActor, styleClasses) {
        console.log("checking actor: " + rootActor);
        console.log("checking actor.styleClass: " + rootActor.styleClass);
        if(styleClasses.includes(rootActor.styleClass)) {
            return rootActor;
        }
        let actor = null;
        let children = rootActor.get_children();
        console.log("checking actor.children.length: " + children.length);
        for(let i=0; i < children.length; i++) {
            console.log("checking child: " + i);
            actor = this.findStyleClassRecursive(children[i], styleClasses);
            if(actor) {
                return actor;
            }
        }
        return null;
    }
    moveActor(_dialog, monitor) {
        console.log("multi-monitor-login@derflocki.github.com: _dialog: " + Main.screenShield._dialog);
        _dialog.get_children().forEach((child) => {
            console.log("multi-monitor-login@derflocki.github.com: _dialog.child: " + child);
            child.get_constraints().forEach((constraint) => {
                //constraint: https://github.com/GNOME/gnome-shell/blob/main/js/ui/layout.js#L39
                /** @type {ClutterConstraint}*/
                //MonitorConstraint
                //TODO: check for the "object instance wrapper GType:Gjs_ui_layout_MonitorConstraint jsobj@0x366081898588 native@0x5626ed2f6930"
                console.log("multi-monitor-login@derflocki.github.com: ClutterConstraint: " + constraint);
                constraint.index = monitor.index;
            });
        });
    }
};
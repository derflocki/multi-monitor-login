import Atspi from 'gi://Atspi';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {getPointerWatcher} from 'resource:///org/gnome/shell/ui/pointerWatcher.js';

export {MultiMonitorLogin};

const MultiMonitorLogin = class {

    lastMonitor = {x: 0, y: 0, width: 0, height: 0};
    pointerWatcherRef;

    _trackMouse(mouse_x, mouse_y) {
        let current = this.getMonitorAtPosition(mouse_x, mouse_y);
        if(!current) {
            return;
        }
        /*
        //are we on another monitor?
        if ((current.x === this.lastMonitor.x) &&
            (current.y === this.lastMonitor.x) &&
            (current.width === this.lastMonitor.width) &&
            (current.height === this.lastMonitor.height)
        ) {
            return;
        }
        */

        //move the relevant actor ot the current monitor
        this.moveActors(current, this.lastMonitor);
        this.lastMonitor = current;
    };

    getMonitorAtPosition(mouse_x, mouse_y) {
        let monitor = Main.layoutManager.monitors.filter(m => {
            return (m.x < mouse_x) && (mouse_x < m.x + m.width) &&
                (m.y < mouse_y) && (mouse_y < m.y + m.height);
        });
        if(monitor.length == 1) {
            return monitor[0];
        }
        return undefined;
    }

    enable() {
        this.lastMonitor = {x: 0, y: 0, width: 0, height: 0};
        console.log("multi-monitor-login@derflocki.github.com enable");
        let pointerWatcher = getPointerWatcher();
        this.pointerWatcherRef = pointerWatcher.addWatch(500, (x, y) => {
            this._trackMouse(x,y);
        });
        console.log("multi-monitor-login@derflocki.github.com enable complete");
    }

    /**
     * This extension moves the unlock dialog to the Monitor the user clicks
     */
    disable() {
        console.log("multi-monitor-login@derflocki.github.com disable");
        if(this.pointerWatcherRef) {
            this.pointerWatcherRef.remove();
        }
        console.log("multi-monitor-login@derflocki.github.com disable complete");
    }

    moveActors(current, last) {
        //Main.notify('Mouse moved to another monitor', 'New Monitor ' + JSON.stringify(current));
        console.log("multi-monitor-login@derflocki.github.com: New Monitor " + JSON.stringify(current));
        if(!Main.screenShield) {
            return;
        }
        console.log("multi-monitor-login@derflocki.github.com: " + Main.screenShield);
        console.log("multi-monitor-login@derflocki.github.com: " + Main.screenShield._dialog.x);
    }
};
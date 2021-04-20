function removeFromList(list, item) {
    for (let i = 0; i < list.length; i++) {
        if (list[i] === item) {
            list.splice(i, 1);
            i--;
        }
    }
}
function callAll(list, value) {
    list.forEach((callback) => {
        callback(value);
    })
}/*
class TouchListener{
    constructor(element){
        this.touches={};
        this.element=element;
        element.addEventListener("touchmove", updateEvent);
        element.addEventListener("touchend", endEvent);
        element.addEventListener("touchcancel", endEvent);
    }
}*/
function TouchListener(element) {
    const touches = {};
    const onnewlist = [];
    const onupdatelist = [];
    const onendlist = [];
    const onswipelist = [];
    const ontapslist = [];
    const TAPTIME = 250;
    let tapwait = null;
    let taps;
    let tappos;
    const positionAt = (touch, time) => {
        const path = touch.path;
        if (time < touch.startTime) {
            return [touch.startX, touch.startY];// Return the initial position if asked before existed
        }
        if (time >= path[path.length - 1][2]) {
            return [touch.currentX, touch.currentY]; // Return current pos if asked about time after last recorded
        }
        for (let j = path.length - 2; j >= 0; j--) {
            if (path[j][2] <= time) {
                const ratio = (time - path[j][2]) / (path[j + 1][2] - path[j][2])
                return [ratio * (path[j + 1][0] - path[j][0]) + path[j][0], ratio * (path[j + 1][1] - path[j][1]) + path[j][1]]
            }
        }
    }
    const inertiaSample = (touch, time, milliseconds) => {
        if (time < touch.startTime || touch.path.length < 2) {
            return [0, 0];
        }
        if (time - milliseconds < touch.startTime) {
            milliseconds = time - touch.startTime;
        }
        const startP = positionAt(touch, time - milliseconds);
        const endP = positionAt(touch, time);
        return [(endP[0] - startP[0]) * 1000 / milliseconds, (endP[1] - startP[1]) * 1000 / milliseconds];
    }
    element.addEventListener("touchstart", function (event) {
        event.preventDefault();
        const rect = element.getBoundingClientRect(),
            currentTime = new Date().getTime();
        for (let i = 0; i < event.changedTouches.length; i++) {
            const changedTouch = event.changedTouches[i];
            const touch = {
                startX: changedTouch.clientX - rect.left,
                startY: changedTouch.clientY - rect.top,
                identifier: changedTouch.identifier,
                active: true,
                distance: 0,
                startTime: currentTime
            };
            const info = { touch: touch, onupdatelist: [], onendlist: [] };
            //info.periodic = setInterval(() => { info.touch.path.push(info.touch.path[info.touch.path.length - 1]); callAll(info.onupdatelist, touch); callAll(onupdatelist, touch); }, 50);
            touches[changedTouch.identifier] = info;
            touch.currentX = touch.startX;
            touch.currentY = touch.startY;
            touch.path = [[touch.startX, touch.startY, currentTime]];
            touch.getInertia = (time = new Date().getTime(), milliseconds = 100) => {
                return inertiaSample(touch, time, milliseconds);
            }
            touch.addEventListener = (type, callback) => {
                if (type.toLowerCase() === 'update') {
                    info.onupdatelist.push(callback);
                }
                else if (type.toLowerCase() === 'end') {
                    info.onendlist.push(callback);
                }
                else {
                    return false;
                }
                return true;
            };
            callAll(onnewlist, touch);
            callAll(info.onupdatelist, touch);
            callAll(onupdatelist, touch);
        }
    }, true);
    function updateEvent(event) {
        event.preventDefault();
        const rect = element.getBoundingClientRect(),
            currentTime = new Date().getTime();
        for (let i = 0; i < event.changedTouches.length; i++) {
            const changedTouch = event.changedTouches[i];
            const info = touches[changedTouch.identifier];
            const touch = info.touch;
            touch.currentX = changedTouch.clientX - rect.left;
            touch.currentY = changedTouch.clientY - rect.top;
            touch.distance += Math.sqrt((touch.currentX - touch.path[touch.path.length - 1][0]) ** 2 + (touch.currentY - touch.path[touch.path.length - 1][1]) ** 2);
            touch.path.push([touch.currentX, touch.currentY, currentTime]);
            callAll(info.onupdatelist, touch);
            callAll(onupdatelist, touch);
        }
    }
    function endEvent(event) {
        updateEvent(event);
        const currentTime = new Date().getTime();
        for (let i = 0; i < event.changedTouches.length; i++) {
            const info = touches[event.changedTouches[i].identifier]
            delete touches[event.changedTouches[i].identifier];
            const touch = info.touch
            touch.active = false;
            const inertia = touch.getInertia();
            touch.inertia = inertia;
            //clearInterval(info.periodic);
            if ((inertia[0] * inertia[0] + inertia[1] * inertia[1]) > 10000) { // If vector has magnatude greater than 100
                callAll(onswipelist, touch);
            } else if (touch.distance < 50 && currentTime - touch.startTime < TAPTIME) {
                if (tapwait) {
                    clearTimeout(tapwait);
                    if (((touch.currentX - tappos[0]) ** 2 + (touch.currentY - tappos[1]) ** 2) < 10000) { // If tap is close to first tap
                        taps += 1;
                    } else {
                        taps = 1;
                        tappos = [touch.currentX, touch.currentY];
                    }
                } else {
                    taps = 1;
                    tappos = [touch.currentX, touch.currentY];
                }
                tapwait = setTimeout(() => {
                    touch.taps = taps;
                    callAll(ontapslist, touch)
                    tapwait = null;
                }, TAPTIME)
            }
            callAll(info.onendlist, touch);
            callAll(onendlist, touch);
        }
    }
    element.addEventListener("touchmove", updateEvent, true);
    element.addEventListener("touchend", endEvent, true);
    element.addEventListener("touchcancel", endEvent, true);
    return {
        addEventListener: (type, callback) => {
            if (type.toLowerCase() === 'new') {
                onnewlist.push(callback);
            }
            else if (type.toLowerCase() === 'end') {
                onendlist.push(callback);
            }
            else if (type.toLowerCase() === 'update') {
                onupdatelist.push(callback);
            }
            else if (type.toLowerCase() === 'swipe') {
                onswipelist.push(callback);
            }
            else if (type.toLowerCase() === 'taps') {
                ontapslist.push(callback);
            }
            else {
                return false;
            }
            return true;
        }, removeEventListener: (type, callback) => {
            if (type.toLowerCase() === 'new') {
                removeFromList(onnewlist, callback);
            }
            else if (type.toLowerCase() === 'end') {
                removeFromList(onendlist, callback);
            }
            else if (type.toLowerCase() === 'update') {
                removeFromList(onupdatelist, callback);
            }
            else if (type.toLowerCase() === 'swipe') {
                removeFromList(onswipelist, callback);
            }
            else if (type.toLowerCase() === 'taps') {
                removeFromList(ontapslist, callback);
            }
            else {
                return false;
            }
            return true;
        }
    }
}
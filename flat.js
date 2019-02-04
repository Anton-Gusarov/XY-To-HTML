/*function draw1(bboxMap) {
    const body = document.querySelector('body');
    Object.keys(bboxMap).forEach((key) => {
        const el = document.createElement('div'),
            props = R.map(val => val + 'px', bboxMap[key]);
        el.className = 'comp';
        el.innerText = key;
        Object.assign(el.style, props);
        body.appendChild(el);
    })
}

const bboxMap = {
    '1': {
        top: 0,
        width: 100,
        left: 0
    },
    '2': {
        top: 51,
        width: 100,
        left: 300
    },
    '3': {
        top: 110,
        width: 50,
        left: 70
    },
    '4': {
        top: 110,
        width: 100,
        left: 350
    },
    '5': {
        top: 170,
        width: 205,
        left: 107
    },
    '6': {
        top: 240,
        width: 40,
        left: 0
    },
    '7': {
        top: 240,
        width: 300,
        left: 60
    }
}
const bboxMap2 = {
    13: {"top": 600, "left": 0, "width": 760, "height": 50},
    12: {"top": 425, "left": 365, "width": 20, "height": 50},
    11: {"top": 322, "left": 444, "width": 292, "height": 260},
    10: {"top": 255, "left": 611, "width": 111, "height": 50},
    9: {"top": 255, "left": 444, "width": 111, "height": 50},
    8: {"top": 494, "left": 242, "width": 111, "height": 50},
    7: {"top": 427, "left": 0, "width": 111, "height": 50},
    6: {"top": 334, "left": 71, "width": 280, "height": 50},
    4: {"top": 176, "left": 281, "width": 111, "height": 50},
    3: {"top": 176, "left": 71, "width": 111, "height": 50},
    2: {"top": 105, "left": 17, "width": 489, "height": 50},
    14: {"top": 60, "left": 510, "width": 40, "height": 30},
    16: {    top: 5,
left: 630,
width: 40,
height: 72},
    17: {    top: 82,
left: 555,
width: 114,
height: 30},
    5: {"top": 33, "left": 313, "width": 111, "height": 50},
    15: {"top": 5, "left": 515, "width": 111, "height": 20},
    18: {top: 51,
left: 176,
width: 111,
height: 50},
    1: {"top": 33, "left": 145, "width": 111, "height": 50}
}*/
renderWorkspace(cols)
// console.log(findColumnsOnSameX(bboxes, bboxes[11]))
const template =  {
    "minX": 0,
    "minY": 0,
    "maxX": 1280,
    "maxY": 4640,
    "id": 0,
    "zIndex": 0,
    "kind": "TEMPLATE",
    "oldId": "root"
};
// document.getElementById('html').innerHTML = renderRowcol(flatten(cols, template));
function doPushdown(val) {
    const newCm = pushDown(cols, template, val);
    renderWorkspace(newCm)
}
//var tree = rbush(4);
//tree.load(cols);

// depth first search
// start with roots as children


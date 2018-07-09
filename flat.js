function draw(bboxMap) {
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

const bboxes = [];
Object.keys(bboxMap).forEach(key => {
    const cmp = bboxMap[key]
    bboxes.push({
        minX: cmp.left,
        minY: cmp.top,
        maxX: cmp.left + cmp.width,
        maxY: cmp.top + cmp.height || 50,
        id: key
    });
});
var tree = rbush(1);
tree.load(bboxes);
// num1 - higher, num2 - lower
function distance(num1, num2) {
    return bboxes[num2 - 1].minY - bboxes[num1 - 1].maxY;
}

const graphDS = {
    1: [2],
    2: [3,4,9],
    3: [6],
    4: [6],
    5: [2],
    6: [7,8],
    7: [],
    8: [],
    9: [11],
    10: [11],
    11: []
};

const bboxMap2 = {
    11: {"top": 322, "left": 444, "width": 292, "height": 260},
    10: {"top": 255, "left": 611, "width": 111, "height": 50},
    9: {"top": 255, "left": 444, "width": 111, "height": 50},
    8: {"top": 494, "left": 242, "width": 111, "height": 50},
    7: {"top": 427, "left": 0, "width": 111, "height": 50},
    6: {"top": 334, "left": 71, "width": 321, "height": 50},
    4: {"top": 176, "left": 281, "width": 111, "height": 50},
    3: {"top": 176, "left": 71, "width": 111, "height": 50},
    2: {"top": 105, "left": 17, "width": 489, "height": 50},
    5: {"top": 33, "left": 313, "width": 111, "height": 50},
    1: {"top": 33, "left": 145, "width": 111, "height": 50}
}
draw(bboxMap2);
// depth first search
const cols = [
    {
        minX: bboxMap2[1].left,
        maxX: bboxMap2[2].left + bboxMap2[2].width,// 506
        components: true,
        rows: [
            {
                minY: bboxMap2[1].top,
                maxY: bboxMap2[8].top + bboxMap2[8].height,
                minX: bboxMap2[1].left,
                maxX: bboxMap2[1].left + bboxMap2[1].width,
                cols: [
                    {
                        minX: bboxMap2[1].left,
                        maxX: bboxMap2[1].left + bboxMap2[1].width,
                        component: bboxMap2[1]
                    }
                ]
            },
            {
                minY: bboxMap2[2].top, //105
                maxY: bboxMap2[2].top + bboxMap2[2].height, //155
                minX: bboxMap2[2].left, //17
                maxX: bboxMap2[2].left + bboxMap2[2].width, //506
                cols: [
                    {
                        minX: bboxMap2[2].left, //17
                        maxX: bboxMap2[2].left + bboxMap2[2].width, //506
                        component: bboxMap2[2]
                    }
                ]
            },
            {
                minY: bboxMap2[3].top, //176
                maxY: bboxMap2[3].top + bboxMap2[3].height, // 226
                minX: bboxMap2[3].left,//71
                maxX: bboxMap2[4].left + bboxMap2[4].width, // 392
                cols: [
                    {
                        minX: bboxMap2[3].left,//71
                        maxX: bboxMap2[3].left + bboxMap2[3].width, //182
                        component: bboxMap2[3]
                    },
                    {
                        minX: bboxMap2[4].left,//281
                        maxX: bboxMap2[4].left + bboxMap2[4].width, //392
                        component: bboxMap2[3]
                    }
                ]
            },
            {
                minY: bboxMap2[6].top,//334
                maxY: bboxMap2[6].top + bboxMap2[6].height,//384
                minX: bboxMap2[6].left,//71
                maxX: bboxMap2[6].left + bboxMap2[6].width,//392
                cols: [
                    {
                        minX: bboxMap2[6].left,//71
                        maxX: bboxMap2[6].left + bboxMap2[6].width,//392
                        component: bboxMap2[6]
                    }
                ]
            },
            {
                minY: bboxMap2[7].top, // 427
                maxY: bboxMap2[7].top + bboxMap2[7].height, //477
                minX: bboxMap2[7].left,//0
                maxX: bboxMap2[7].left + bboxMap2[7].width,//50
                cols: [
                    {
                        minX: bboxMap2[7].left,
                        maxX: bboxMap2[7].left + bboxMap2[7].width,
                        component: bboxMap2[7]
                    }
                ]
            }
        ]
    }
]
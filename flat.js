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
const colsArray = [...toArray(cols)].concat(template),
    layers = getLayers(colsArray), // Produce groups where some elements are nesting others. See docs.
    ds = flatten(layers);
document.getElementById('html').innerHTML = renderRowcol(ds, cols);
let cmmap = cols;
function doPushdown(val) {
    const newCm = pushDown(cmmap, template, val);
    renderWorkspace(newCm);
    cmmap = newCm;
}


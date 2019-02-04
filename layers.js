function getMiddle(component, letter) {
    return (component['max' + letter] - component['min' + letter]) / 2 + component['min' + letter];
}
function getLayers(colsArray) {
    const cmpsQueue = [...colsArray].sort((a, b) => (b.zIndex - a.zIndex)),
        result = [];
    let accumulatedItems = [cmpsQueue.shift()];
    while (cmpsQueue.length) {
        const tree = rbush(),
            component = cmpsQueue.shift();
        tree.load(accumulatedItems);
        const overlapped =  tree.search(component),
            allChildren = overlapped
                .filter(cmp => {
                    if (cmp.zIndex <= component.zIndex) return false;
                    // filter out snapped components because rbush has non strict condition
                    if (cmp.maxX === component.minX || cmp.minX === component.maxX
                    || cmp.maxY === component.minY || cmp.minY === component.maxY) return false;
                    return getMiddle(cmp, 'X') >= component.minX
                        && getMiddle(cmp, 'X') < component.maxX
                        && getMiddle(cmp, 'Y') >= component.minY
                        && getMiddle(cmp, 'Y') < component.maxY;
                });
        // filter out these yielded nested items
        accumulatedItems = accumulatedItems.filter(cmp => {
            return !allChildren.find(nestedItem => nestedItem.id === cmp.id);
        });
        if (allChildren.length) {
            result.push({
                block: component,
                items: allChildren
            })
        }
        accumulatedItems.push(component);
    }
    return result;
}

function flatten(layers, template) {
    const structure = layers.reduce((acc, layer) => {
            acc[layer.block.id] = getRowsAndCols(toMap(layer.items));
            return acc;
        }, {});
    return structure;
}

function applyTopChangesToMap(cmpMap, topChanges) {
    return Object.assign(cmpMap, Object.keys(topChanges).reduce((acc, key) => {
        acc[key] = {...cmpMap[key]};
        acc[key].minY += topChanges[key];
        acc[key].maxY += topChanges[key];
    return acc;
}, {}));
}

function applyTopChangesToHeight(columnsMap, allHeightChanges) {
    return Object.assign(columnsMap, Object.keys(allHeightChanges).reduce((acc, key) => {
        acc[key] = {...columnsMap[key]};
        acc[key].maxY += allHeightChanges[key];
    return acc;
}, {}));
}

function getAllChildren(layersMap, id) {
    if (!layersMap[id]) return [];
    const containersToInspect = [...layersMap[id]],
        allChildren = [];
    let currentId = id;
    while (containersToInspect.length) {
        allChildren.push(...(layersMap[currentId] || []));
        currentId = containersToInspect.shift().id;
        containersToInspect.push(...(layersMap[currentId] || []));
    }
    return allChildren;
}

function pushDown(columnsMap, template, val) {
    const colsArray = [...toArray(columnsMap)].concat(template),
        textComponents = colsArray.filter(item => item.kind === 'TEXT'),
        heightChangesMap = textComponents.reduce((acc, cmp) => {
            acc[cmp.id] = val;
            return acc;
        }, {}),
        layers = getLayers(colsArray),
        ds = flatten(layers);
    const { topChanges, heightChanges } = getPushdownChanges(ds, layers, textComponents, val),
        allHeightChanges = Object.assign(heightChangesMap, heightChanges),
        columnsMapHeight = applyTopChangesToHeight(columnsMap, allHeightChanges);
    return applyTopChangesToMap(columnsMapHeight, topChanges);
}

function createMeasureComponent({block, items}) {
    return {
        ...block,
        id: 'measure',
        minY: block.maxY,
        maxY: block.maxY
    };
}

function getPushdownChanges(ds, layers, heightChangedComponents, val) {
    let heightChangedComponentsOp = [...heightChangedComponents];
        const topChanges = {}, heightChanges = {},
            layersMap = layers.reduce((acc, layer) => {
                acc[layer.block.id] = layer.items;
                return acc;
            }, {});
    layers.forEach(layer => {
        const rows = ds[layer.block.id],
            pushingComponents = R.innerJoin((record1, record2) => record1.id === record2.id, heightChangedComponentsOp, layer.items);
        if (pushingComponents.length) {
            const measureComponent = createMeasureComponent(layer);
            rows.push([measureComponent]);
            const changesMap = calcNewTopPositions(rows, pushingComponents, [...layer.items, measureComponent], val, heightChanges),
                newBlockHeightChange = calcBlocksHeight(layer, changesMap) || val;
            delete changesMap['measure'];
            // remove unnecessary pushing components
            heightChangedComponentsOp = R.without(pushingComponents, heightChangedComponentsOp);
            // add block to pushing components because its height was changes and thus it pushes
            heightChangedComponentsOp.push(layer.block);
            // Components are changing height only once
            heightChanges[layer.block.id] = newBlockHeightChange;
            if (Object.keys(changesMap).length) {
                // changes of internal components of affected within current block. Children are pushed together with block
                const internalChanges = Object.keys(changesMap).reduce((acc, affectedId) => {
                    const allchildren = getAllChildren(layersMap, affectedId);
                    if (allchildren.length) {
                        // topChanges already contains initial changes
                        allchildren.forEach(item => {
                            acc[item.id] = changesMap[affectedId];
                        });
                    }
                    return acc;
                }, {});

                // merge internalChanges into topChanges
                Object.keys(internalChanges).forEach(key => {
                    topChanges[key] = topChanges[key] ? topChanges[key] + internalChanges[key] : internalChanges[key];
                });
                Object.assign(topChanges, changesMap);
            }
        }
    });
    return {topChanges, heightChanges};
}
function calcBlocksHeight(layer, changesMap) {
    // put a component belowest and calc its pushing distance
    // native sort is buggy
    const biggest = R.sort(function(a, b) { return a - b; }, toArray(changesMap)).pop();
    return biggest;
}
const kindColor = {
    'TEXT': 'black',
    'BUTTON': 'green',
    'IMAGE': 'pink',
    'BACKGROUND': 'white',
    'STRIP': 'gray'
};
const kindBorder = {
    'TEXT': 'none',
    'BUTTON': 'none',
    'IMAGE': 'none',
    'BACKGROUND': '1px black solid',
    'STRIP': 'none'
}
function renderComponent(cmp) {
    return `<div class="comp" id="` + cmp.oldId + `" style="
        top: ` + cmp.minY + `px;
        left: ` + cmp.minX + `px;
        width: ` + (cmp.maxX - cmp.minX) + `px;
        height: ` + (cmp.maxY - cmp.minY)  + `px;
        z-index: ` + (cmp.zIndex)  + `;
        background-color: ` + kindColor[cmp.kind]  + `;
        "></div>`
}

function renderWorkspace(compMap) {
    const cols = toArray(compMap),
        bigCol = rbush().load(cols);
    document.getElementById('workspace').style.width = bigCol.maxX;
    document.getElementById('workspace').style.height = bigCol.maxY;
    document.getElementById('workspace').innerHTML = cols.map(renderComponent).join('\n');
}
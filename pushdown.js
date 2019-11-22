function applyTopChangesToMap(cmpMap, topChanges) {
    return Object.assign(cmpMap, Object.keys(topChanges).reduce((acc, key) => {
        if (!cmpMap[key]) return acc;
        acc[key] = {...cmpMap[key]};
    acc[key].minY += topChanges[key];
    acc[key].maxY += topChanges[key];
    return acc;
    }, {}));
}

function applyTopChangesToHeight(columnsMap, allHeightChanges) {
    return Object.assign(columnsMap, Object.keys(allHeightChanges).reduce((acc, key) => {
        if (!columnsMap[key]) return acc;
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
    // create
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
    let heightChangedComponentsOp = [...heightChangedComponents]; // means operational
    const topChanges = {}, heightChanges = {},
        layersMap = layers.reduce((acc, layer) => {
            acc[layer.block.id] = layer.items;
            return acc;
        }, {});
    layers.forEach(layer => {
        // Every layer has a grid
        const rows = ds[layer.block.id],
        // Find inside the layer all the elements that being extended. It can be either Text or a some picture containing Text
            pushingComponents = R.innerJoin((record1, record2) => record1.id === record2.id, heightChangedComponentsOp, layer.items);
        // We do actions within layer only if there are extending elements
        if (pushingComponents.length) {
            // Append inside the layer a special measure element that will show us a height by which the layer's main element (container) will extend
            const measureComponent = createMeasureComponent(layer);
            // It must be in the bottom
            rows.push([measureComponent]);
            // Calculate "Y" changes for all elements below every changing element (Text or a container). It is the function calcNewTopPositions. See docs
            const changesMap = calcNewTopPositions(rows, pushingComponents, [...layer.items, measureComponent], val, heightChanges),
            // Calculate height changes based on yielded Y changes
                newBlockHeightChange = calcBlocksHeight(layer, changesMap) || val;
            delete changesMap['measure'];
            // remove unnecessary pushing components
            heightChangedComponentsOp = R.without(pushingComponents, heightChangedComponentsOp);
            // add block to pushing components because its height was changes and thus it pushes
            heightChangedComponentsOp.push(layer.block);
            // Components are changing height only once
            heightChanges[layer.block.id] = newBlockHeightChange;
            if (Object.keys(changesMap).length) {
                // calcNewTopPositions doesn't give changes for those elements which are inbound to containers of the current layer. So that we must calculate "Y" changes for them too.
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
function findPathToComponent(rows, componentId) {
    let i = 0,
        j = 0;
// no floats needed, as they are not supposed to push down
//if (!group.rows) {
//    return [];
//}
    for (; i < rows.length; i++) {
        let row = rows[i]; // still array
        for (j = 0; j < row.length; j++) {
            let column = row[j];
            if (column.id === componentId) {
                return [i, j];
            } else
            //if (column.components.length > 0 && (R.findIndex(R.propEq('id', componentId))(column.components) > -1)) {
            if (column.rows && column.rows.length > 0) {
                const nestedPath = findPathToComponent(column.rows, componentId);
                if (nestedPath && nestedPath.length > 0) {
                    return [i, j, 'rows'].concat(nestedPath);
                }
            }
            //}
        }
    }
    return [];
}

// Takes path to current component's column. Shifts to the next row. Collects components inside those rows traversing further within group.
// Structure of the path is ['rows', i, 'columns', j, ['rows', i, 'columns', j]]
function findComponentsFurtherInPath(rows, pathInitial) {
    let path = [...pathInitial],
    components = [];
    while (path.length > 0) {
        // shift to the next row happens here
        // $FlowFixMe array has different types
        let rowCounter = path[path.length - 2] + 1;
        path[path.length - 2] = rowCounter;
        let row = R.path(path.slice(0, path.length - 1))(rows);
        while (row) {
            let columnCounter = 0;
            path[path.length - 1] = columnCounter;
            let column = R.path(path)(rows);
            while (column) {
                components = components
                    .concat(column.components && column.components.length ? R.pluck('id', column.components): [column.id])
                    .concat(column.floated ? R.pluck('id', column.floated) : []);
                columnCounter++;
                path[path.length - 1] = columnCounter;
                column = R.path(path)(rows);
            }
            columnCounter = 0;
            path[path.length - 1] = columnCounter;
            rowCounter++;
            path[path.length - 2] = rowCounter;
            row = R.path(path.slice(0, path.length - 1))(rows);
        }
        // level up in path
        path.splice(-3, path.length);
    }
    return components;
}

function calcNewTopPositions(rows, heightChanged, components, val, heightChanges) {
    const affectedComponentsMap = heightChanged.reduce((acc, cmp) => {
        acc[cmp.id] =findComponentsFurtherInPath(rows, findPathToComponent(rows, cmp.id));
        return acc;
    }, {}),
// simply a map
        componentInListMap = components.reduce((acc, component, index) => {
            acc[component.id] = index;
            return acc;
        }, {}),
        g = new jsgraphs.WeightedDiGraph(components.length),
        componentsChangesMapMap = {};
    Object.keys(affectedComponentsMap).forEach(heightChangedId => {
        affectedComponentsMap[heightChangedId].forEach(affectedComponent => {
            g.addEdge(
                new jsgraphs.Edge(
                    componentInListMap[heightChangedId],
                    componentInListMap[affectedComponent],
                    -heightChanges[heightChangedId] || -val
                )
        );
        });
    });
    heightChanged.forEach(hcComponent => {
        const dijkstra = new jsgraphs.Dijkstra(g, componentInListMap[hcComponent.id]);
        componentsChangesMapMap[hcComponent.id] = components.reduce((acc, component) => {
            acc[component.id] = dijkstra.distanceTo(componentInListMap[component.id]);
            return acc;
        }, {});
    });
    return components.reduce((acc, component) => {
        acc[component.id] = - Object.keys(componentsChangesMapMap).reduce((min, key) => {
            return min < componentsChangesMapMap[key][component.id] ? min : componentsChangesMapMap[key][component.id];
        }, 0);
        if (acc[component.id] <= 0) delete acc[component.id];
        return acc;
    }, {});
}


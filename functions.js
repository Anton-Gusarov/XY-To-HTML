function toArray(map) {
    return Object.keys(map).map(function (value) { return map[value] })
}
function toMap(ar) {
    return ar.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {});
}

function RbushBbox(minx, miny, maxx, maxy, id) {
    this.minX = minx;
    this.minY = miny;
    this.maxX = maxx;
    this.maxY = maxy;
    this.id = id;
}
// Finds all columns which together with @columnToCheck form an intersecting by Y group of columns. They produce a single row.
function findColumnsOnSameY(allColumns, columnToCheck) {
    const tree = rbush();
    tree.load(allColumns);
    const maxX = tree.data.maxX;
    let componentsWereAdded = true,
        columnsOnSameXTree = rbush();
    columnsOnSameXTree.insert(columnToCheck);
    while (componentsWereAdded) {
        componentsWereAdded = false;
        const areaToCheck = {
                minX: tree.data.minX + 1,
                maxX: maxX - 1,
                minY: columnsOnSameXTree.data.minY + 1,
                maxY: columnsOnSameXTree.data.maxY - 1
            },
            intersectionsY = tree.search(areaToCheck);
        if (intersectionsY.length > columnsOnSameXTree.all().length) {
            componentsWereAdded = true;
            columnsOnSameXTree = rbush();
            columnsOnSameXTree.load(intersectionsY);
        }
    }
    return columnsOnSameXTree.all();
}
/**
 * Create Saturated graph from rbush bboxes array
 * @param bboxes {RbushBbox[]}
 * @returns {DiGraph|*}
 */
function createVerticalSaturatedGraph(bboxes) {
    var tree = rbush();
    tree.load(bboxes);
    const maxX = tree.data.maxX,
        maxY = tree.data.maxY,
        intersectionsX = {},
    // assign vertices according to ids of elements
        newIds = bboxes.reduce(function (map, element, index) {
            return {...map, [element.id]: index}
        }, {});
    bboxes.forEach((cmp) => {
        const checkBBox = {
            minX: cmp.minX+1,
            minY: cmp.minY+1,
            maxX: cmp.maxX-1,
            maxY: maxY-1
        };
        intersectionsX[cmp.id] = tree.search(checkBBox).map(treeRecord => treeRecord.id);
    });
    var g = new jsgraphs.DiGraph(bboxes.length);
    Object.keys(intersectionsX).forEach((key) => {
        const intersections = intersectionsX[key],
            newIdKey = newIds[key];
        intersections.filter(function (cmpId) {
            return cmpId !== key;
        }).forEach(cmpId => g.addEdge(newIdKey, newIds[parseInt(cmpId, 10)]));

});
    return g;
}

function createPlainGrpah(g) {
    var pg = new jsgraphs.Graph(g.V);
    for (var v = 0; v < g.V; ++v) {
        var adj_v = g.adjList[v];
        for (var i = 0; i < adj_v.length; ++i){
            var w = adj_v[i];
            pg.addEdge(w, v);
        }
    }
    return pg;
}

function findComponents(g) {
    const pg = createPlainGrpah(g);
    return new jsgraphs.ConnectedComponents(pg)
}

function rbushToColumnSize(tree) {
    return {
        minX: tree.data.minX,
        minY: tree.data.minY,
        maxX: tree.data.maxX,
        maxY: tree.data.maxY
    }
}

function extractGroupsFromComponents(componentsIds, items) {
    const groupMap = componentsIds.reduce(function (map, groupId, index) {
            const group = map[groupId] || [];
            group.push(items[index]);
            map[groupId] = group;
            return map;
        }, {});
        return Object.keys(groupMap).map(function (value) { return groupMap[value] });
}

function getStaticComponent(columns) {
    return columns[0];
}

function getRowsAndCols(columnsMap) {
    // find all intersecting components here. Then make a map in front of a map of static components
    //const columnsMap = convertCmpMapToColumnMap(componentsMap),
        const componentsArray = toArray(columnsMap),
        floatedMap = {},
        g = createVerticalSaturatedGraph(componentsArray),
        components = new jsgraphs.StronglyConnectedComponents(g);
    const groups = extractGroupsFromComponents(components.id, componentsArray),
        complexGroups = groups.filter(function (group) {
            return group.length > 1;
        });
    complexGroups.forEach(function (group) {
        const staticColumn = getStaticComponent(group);
        floatedMap[staticColumn.id] = [];
        group.filter(function (column) {
            return column !== staticColumn;
        }).forEach(function (column) {
            delete columnsMap[column.id];
            floatedMap[staticColumn.id].push(column);
        });
        staticColumn.floated = floatedMap[staticColumn.id];
    });
    const nestedColumnsData = {
        0: toArray(columnsMap)
        };
    let rows = produceRows(nestedColumnsData[0], nestedColumnsData, columnsMap);
    rows = mergeRows(rows, nestedColumnsData, columnsMap);
    // This loop inserts @components property to the complex columns (which contain rows)
    Object.keys(nestedColumnsData).forEach(function (key) {
        if (key === "0" || !parseInt(key, 10)) {
            return;
        }
        columnsMap[key].components = flattenColumnList(columnsMap[key], nestedColumnsData, columnsMap);
        nestedColumnsData[key].forEach(function (column) {
            column.components = flattenColumnList(column, nestedColumnsData, columnsMap);
        });
    });
    return rows;
}
/**
 * This simply splits to rows and cols from set of @columns absolutely positioned
 * @param columns array of columns which needs to be split into rows
 * @param nestedColumnsData map of complex columns where each complex column id contains an array of nested other columns
 * @param allColumnsMap all columns at a time
 * @param columnId tells which id to use for newly created columns. Can be optimized.
 */
function produceRows(columns, nestedColumnsData, allColumnsMap, columnId = 0) {
    const
    // create a big column
        mainColumn = rbushToColumnSize(rbush().load(columns)),
        complexColQ = [mainColumn];
    // Create an incremented index for newly created complex columns
    let maxComplexColIndex = parseInt(Object.keys(allColumnsMap).sort(function (a, b) { return parseInt(b, 10) - parseInt(a, 10); })[0], 10);
    mainColumn.id = mainColumn.id || columnId;
    if (!maxComplexColIndex) {
        maxComplexColIndex = columns.length;
    }
    while (complexColQ.length) {
        const currentComplexCol = complexColQ.shift(),
            currentComplexColIndex = currentComplexCol.id || columnId,
        // nested columns inside complex one
            nestedColumnsInsideCurrentComplex = nestedColumnsData[currentComplexColIndex],
            markedMinorColumns = {},
            rows = [],
        // Keep data of previously created column in order to stop on repeating iterations. It happens on quadratic patterns.
            currentComplexColToCheck = { ...currentComplexCol };
    delete currentComplexColToCheck.id;
    // the column was added before so that it is a ref to a column inside parent row. remove this to avoid detractor
    currentComplexCol.rows = rows;
    for (let j = 0; j < nestedColumnsInsideCurrentComplex.length; j++) {
        const currentCol = nestedColumnsInsideCurrentComplex[j];
        // Avoid nested columns from calculation because now we produce new columns from existing ones.
        if (markedMinorColumns[currentCol.id]) continue;
        // columns which will be fit into single row
        let sameRowColumns = findColumnsOnSameY(nestedColumnsInsideCurrentComplex, currentCol);
        sameRowColumns.forEach(function (column) {
            markedMinorColumns[column.id] = true;
        });
        // Find vertically overlapping simple columns and group them into complex columns of the row
        const g = createVerticalSaturatedGraph(sameRowColumns);
        const components = findComponents(g);
        // const groups = findGroupsOnSameX(sameRowColumns);
        // Check if there are X overlapping columns. If there are they are subject to nested row-col structure and thus they are complex.
        if (components.count < sameRowColumns.length) {
            // Groups are the same as columns
            const groups = extractGroupsFromComponents(components.id, sameRowColumns),
            // aka complex columns
                complexGroups = groups.filter(function (group) {
                    return group.length > 1;
                });
            // columnData will be assigned with new list
            let newNestedColumnsInsideCurrentComplex = [...nestedColumnsInsideCurrentComplex],
                previousGroup;
            complexGroups.forEach(group => {
                if (R.equals(group, previousGroup)) {
                    // Never noticed it comes here
                    return;
                }
                previousGroup = group;
                maxComplexColIndex++;
                // New column from group
                const newColumn = rbushToColumnSize((rbush()).load(group));
                if (R.equals(currentComplexColToCheck, newColumn)) {
                    // quadratic pattern. same col. Find floating components but one of them left static. Assume that these are simple columns because splitting logic cannot produce quadratic pattern
                    const staticColumn = getStaticComponent(group),
                        columnsToFloat = group.filter(function (column) {
                            return column !== staticColumn;
                        });
                    // remove floating columns from sameRowColumns
                    columnsToFloat.forEach(function (column) {
                        sameRowColumns.splice(sameRowColumns.indexOf(column), 1);
                    });
                    // leave this static column for rendering and assign floating components to the final DS right here.
                    staticColumn.floating = columnsToFloat.map(function (column) {
                        return column.component;
                    });
                    return;
                }
                newColumn.id = maxComplexColIndex;
                // Schedule new column for calc
                complexColQ.push(newColumn);
                // make record to all necessary registers
                newNestedColumnsInsideCurrentComplex.push(newColumn);
                allColumnsMap[maxComplexColIndex] = newColumn;
                // Modify existing data of complex column for them to have actual complex columns but not simple
                newNestedColumnsInsideCurrentComplex = newNestedColumnsInsideCurrentComplex.filter(function (column) {
                    return group.indexOf(column) === -1;
                });
                // Modify info of columns that current complex column has
                nestedColumnsData[currentComplexCol.id] = newNestedColumnsInsideCurrentComplex;
                nestedColumnsData[maxComplexColIndex] = group;

                // Remove simple columns from row's columns
                sameRowColumns = sameRowColumns.filter(function (column) {
                    return group.indexOf(column) === -1;
                });
                // Insert new column into row's columns
                sameRowColumns.push(newColumn);
            });
        }
        // here could go order cols by left
        // add columns to a row
        rows.push(sameRowColumns);
    }
    // Needed to sort them for correct output. Or it can be done at final data.
    sortRowsByTop(rows);
}
return mainColumn.rows;
}

function sortRowsByTop(rows) {
    rows.sort(function (a, b) {
        const minYa = a.sort(function (a, b) { return a.minY - b.minY; })[0].minY,
            minYb = b.sort(function (a, b) { return a.minY - b.minY; })[0].minY;
        return minYa - minYb;
    });
    return rows;
}

/**
 *  Optimizes row-col structure to fit application needs like columns must be as high as possible for mobile view ordering.
 Merges all possible rows and creates new columns if two rows can be united into single.
 * @param rowsOriginal row-col DS for merging
 * @param nestedColumnsData map of complex columns feat. its nested columns
 * @param allColumnsMap all the columns at a time
 */
function mergeRows(rowsOriginal, nestedColumnsData, allColumnsMap) {
    const finalRows = [];
    // for newly created col due to merging we create a incremenetd key.
    let maxComplexColIndex = parseInt(Object.keys(allColumnsMap).sort(function (a, b) { return parseInt(b, 10) - parseInt(a, 10); })[0], 10);
    if (!maxComplexColIndex) {
        maxComplexColIndex = nestedColumnsData[0].length;
    }
    let rows = [...rowsOriginal];
    // sort by top
    sortRowsByTop(rows);
    // Array of rows that will be merged
    let rowSet = [],
        startMerging = false;
    for (let i = 0; i < rows.length; i++) {
        rowSet.push(rows[i]);
        const nextRow = rows[i + 1];
        if (nextRow) {
            const checkedRowSet = [...rowSet, nextRow];
            // const checkedGroups = findGroupsOnSameX(R.flatten(checkedRowSet));
            const g = createVerticalSaturatedGraph(R.flatten(checkedRowSet));
            const components = findComponents(g);
            // avoid producing new columns and keep on adding more rows until number or components reduces. Onle then create column
            if (components.count > 1) {
                continue;
            } else {
                // adding new rows for merging is irrelevant because there should be more than 1 column per single row
                startMerging = true;
            }
        } else {
            // we are in end of rows
            startMerging = true;
        }
        if (startMerging) {
            // Find distinct columns in these rows
            // const groups = findGroupsOnSameX(R.flatten(rowSet)),
            const g = createVerticalSaturatedGraph(R.flatten(rowSet)),
                components = findComponents(g),
                groups = extractGroupsFromComponents(components.id, R.flatten(rowSet)),
                sameRowColumns = [];
            rowSet = [];
            groups.forEach(group => {
                if (group.length === 1) {
                    // only one component in the group and it will have an own column
                    sameRowColumns.push(group[0]);
                    return;
                }
                const tree = rbush();
                tree.load(group);
                const newColumn = rbushToColumnSize(tree);
                maxComplexColIndex++;
                newColumn.id = maxComplexColIndex;
                // update refeernces in global variables
                nestedColumnsData[maxComplexColIndex] = group;
                allColumnsMap[maxComplexColIndex] = newColumn;
                sameRowColumns.push(newColumn);
                let rowsDiff = 1,
                    groupRowsAfter;
                // Once we have a one from new columns from merged rows we have to split it to the rows and merge again
                // Keep on doing it until number of rows stopped decreasing
                while (rowsDiff > 0) {
                    const groupRowsBefore = produceRows(group, nestedColumnsData, allColumnsMap, maxComplexColIndex),
                        rowsNumberBefore = groupRowsBefore.length;
                    groupRowsAfter = mergeRows(groupRowsBefore, nestedColumnsData, allColumnsMap);
                    rowsDiff = groupRowsAfter.length - rowsNumberBefore;
                }
                newColumn.rows = groupRowsAfter;
            });
            // here could go order cols by left
            finalRows.push(sameRowColumns);
        }
    }
    return sortRowsByTop(finalRows);
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

/**
 * It inserts @components array into each complex @column
 * @param column For which column to insert
 * @param nestedColumnsData Map of complex columns vs their nested ones
 * @param columnsMap All columns at a time
 */
function flattenColumnList(column, nestedColumnsData, columnsMap) {
    const finalList = [];
    if (nestedColumnsData[column.id] && !column.components) {
        nestedColumnsData[column.id].forEach(function (nestedColumn) {
            if (nestedColumnsData[nestedColumn.id]) {
                finalList.push(...flattenColumnList(nestedColumn, nestedColumnsData, columnsMap));
            } else {
                finalList.push(columnsMap[nestedColumn.id]);
            }
        });
    } else if (nestedColumnsData[column.id] && column.components) {
        finalList.push(...column.components);
    }
    return finalList;
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
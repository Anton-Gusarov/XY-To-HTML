function flatten(layers, template) {
    const structure = layers.reduce((acc, layer) => {
        // We produce grid for every layer independently. Elements on the page without block will also produce a grid.
        acc[layer.block.id] = getRowsAndCols(toMap(layer.items));
        return acc;
    }, {});
    return structure;
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
 * This function groups a long array @componentsIds into short groups
 * @param componentsIds
 * @param items
 * @returns {Array}
 */
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
        //Convenient search for overlapped elements
        g = createVerticalSaturatedGraph(componentsArray), // see docs for this function
        components = new jsgraphs.StronglyConnectedComponents(g);
    const groups = extractGroupsFromComponents(components.id, componentsArray),
    // we need only groups with multiple elements. We need to filter out floating elements to produce a proper grid.
        overlappedGroups = groups.filter(function (group) {
            return group.length > 1;
        });
    // filtering out floating elements
    overlappedGroups.forEach(function (group) {
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
    // initial map of complex columns which will be modified further in functions produceRows and mergeRows
    const nestedColumnsData = {
        0: toArray(columnsMap)
        };
    let rows = produceRows(nestedColumnsData[0], nestedColumnsData, columnsMap);
    // We now make a proper grid with high columns
    rows = mergeRows(rows, nestedColumnsData, columnsMap);
    // This loop inserts @components property to the complex columns (which contain rows). Making data structure convenuent for producing HTML.
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
    // Produce a major column from all @columns
        mainColumn = rbushToColumnSize(rbush().load(columns)),
        // Create complexColumnQeueue with that element
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
        // Find columns which are included in the current one
            nestedColumnsInsideCurrentComplex = nestedColumnsData[currentComplexColIndex],
            markedMinorColumns = {},
            rows = [],
        // Keep data of previously created column in order to stop on repeating iterations. It happens on quadratic patterns.
            currentComplexColToCheck = { ...currentComplexCol };
    delete currentComplexColToCheck.id;
    // TODO remove comment. The column was added before so that it is a ref to a column inside parent row. remove this to avoid ambiguity
    currentComplexCol.rows = rows;
    for (let j = 0; j < nestedColumnsInsideCurrentComplex.length; j++) {
        const currentCol = nestedColumnsInsideCurrentComplex[j];
        // Avoid nested columns from calculation because now we produce new columns from existing ones.
        if (markedMinorColumns[currentCol.id]) continue;
        // Retrieve columns which are on a same row with @currentCol
        let sameRowColumns = findColumnsOnSameY(nestedColumnsInsideCurrentComplex, currentCol);
        // Mark these columns in order to skip them from doing the same again and again because they will appear in this loop
        sameRowColumns.forEach(function (column) {
            markedMinorColumns[column.id] = true;
        });
        // Find vertically mutually projected columns and group them. They will form new columns for further splitting.
        const g = createVerticalSaturatedGraph(sameRowColumns);
        const components = findComponents(g);
        // TODO: const groups = findGroupsOnSameX(sameRowColumns); // planned
        // It means that there are groups. If no mutual projection found then all the elements here are independent.
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
                    // Never noticed it steps here
                    return;
                }
                previousGroup = group;
                maxComplexColIndex++;
                // New column from group
                const newColumn = rbushToColumnSize((rbush()).load(group));
                // It is the case when 4 or more columns produce unsplittable rectangular and columns with absolute position appear. Some required actions.
                // Quadratic pattern. same col. Find floating components but one of them left static. Assume that these are simple columns because splitting logic cannot produce quadratic pattern
                if (R.equals(currentComplexColToCheck, newColumn)) {
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
 Merges all possible rows and creates new columns if two rows can be united into single. See docs.
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
            // TODO const checkedGroups = findGroupsOnSameX(R.flatten(checkedRowSet));
            // Find vertically mutually projected columns and group them. They will form new columns for further splitting.
            const g = createVerticalSaturatedGraph(
                // This is the core action of merging. We flatten several arrays and run the logic to identify if we can produce more columns
                R.flatten(checkedRowSet)
            );
            const components = findComponents(g);
            // avoid producing new columns and keep adding more rows until number of components reduces. Only then create column
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
            // TODO const groups = findGroupsOnSameX(R.flatten(rowSet)),
            // Almost the same action as above with flattening but now we produce columns not just identifying
            const g = createVerticalSaturatedGraph(R.flatten(rowSet)),
                components = findComponents(g),
                groups = extractGroupsFromComponents(components.id, R.flatten(rowSet)),
                sameRowColumns = [];
            rowSet = [];
            groups.forEach(group => {
                if (group.length === 1) {
                    // only one component in the group and it will have own column
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
                // The below loop is interesting. We produce rows from the given group and then recursively call mergeRows on that row set
                // and compare number of rows before and after. Do this until algorithm stuck and cannot compress further.
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
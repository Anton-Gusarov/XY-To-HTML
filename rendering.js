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
function getRowColDataStructure(rows, parentLeft = 0, parentTop = 0) {
    let rowBottom = parentTop;
    const newRows = [];
    rows.forEach(function (columns) {
        const maxYs = R.pluck('maxY', columns).sort(function (a, b) {
                return a - b;
            }),
            maxY = maxYs[maxYs.length - 1],
            rowInstance = {
                top: rowBottom,
                bottom: maxY,
                columns
            };
        columns.sort(function (a, b) {
            return a.minX - b.minX;
        });

        rowBottom = maxY;
        newRows.push(rowInstance);
        let columnRight = parentLeft;
        columns.forEach(function (column) {
            column.top = rowInstance.top;
            column.bottom = maxY;
            column.left = columnRight;
            column.right = column.maxX;
            columnRight = column.maxX;
            if (column.rows) {
                column.rows = getRowColDataStructure(column.rows, column.left, column.top);
            }
        });
    });
    return newRows;
}
function renderRowSet(rowstorender, ds) {
    const rows = [...rowstorender];
    let res = '';
    while (rows.length) {
        const row = rows.shift(),
            columns = [...row.columns];

        res += `<div class="row">`;
        while (columns.length) {
            const column = columns.shift();
            if (column.rows) {
                // no need for margins for this case but good to set min-height
                res += `<div class="col" style="min-height: ${column.bottom - column.top}px; width: ${column.right - column.left}px">`;
                res += renderRowSet(column.rows, ds);
                res += `<br class="cl"/></div>`
            } else {
                // it is a component
                res += `<div class="col" style="min-height: ${column.maxY - column.minY}px; margin-top: ${column.minY - column.top}px; margin-left: ${column.minX - column.left}px">`;
                res += renderComponentFl(column, ds);
                res += `<br class="cl"/></div>`
            }
        }
        // res += `<br class="cl"/></div>`;
        res += `</div>`;
    }
    return res;
}
function renderComponentFl(cmp, ds) {
    return `<div class="compFl" id="` + cmp.oldId + `" style="
        width: ` + (cmp.maxX - cmp.minX) + `px;
        min-height: ` + (cmp.maxY - cmp.minY)  + `px;
        background-color: ` + kindColor[cmp.kind]  + `;
        ">${ds[cmp.id] ? renderRowSet(ds[cmp.id], ds) : ''}</div>`;
}
function renderRowcol(beforeds, cmpMap, template) {
    console.log(beforeds)
    const ds = Object.keys(beforeds).reduce((acc, key) => {
            acc[key] = getRowColDataStructure(beforeds[key], (cmpMap[key] || {}).minX, (cmpMap[key] || {}).minY);
            return acc;
        }, {}),
        rows = ds[0];
    console.log(ds);
    // recursively render a page using only 0.
    return renderRowSet(ds[0], ds)
}
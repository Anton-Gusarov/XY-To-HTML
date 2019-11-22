function toArray(map) {
    return Object.keys(map).map(function (value) { return map[value] })
}
function toMap(ar) {
    return ar.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {});
}
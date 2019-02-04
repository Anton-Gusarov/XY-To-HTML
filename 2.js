function swapWithLeft(a, index) {
    const b = [ ...a],
    temp = b[index - 1];
    b[index-1] = b[index];
    b[index] = temp;
    return b;
}

function Iteration(a) {
    let _a = [...a];
    console.log(_a.toString());

    for (let i = a.length - 1; i>0; i--) {
        _a = swapWithLeft(_a, i);
        console.log(_a.toString());

    }
}

Iteration([1, 2, 3])
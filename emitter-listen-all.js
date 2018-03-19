module.exports = function ({emitter}) {
    let {emit} = emitter;
    emitter.emit = function (...args) {
        console.log('emit:', ...args);
        return emit.apply(emitter, args);
    };
}
module.exports = function ({emitter}) {
    let {emit} = emitter;
    emitter.emit = function (...args) {
        emit.apply(emitter, args);
        args.unshift('*');
        emit.apply(emitter, args);
    };
}
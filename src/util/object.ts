const { isEqual } = require('lodash');

export function hasChanged(obj: any, partial: any, ignore?: boolean): string[] {
    if (ignore) return [];

    let changed_keys = [];
    for (let key of Object.keys(partial)) {
        if (
            !isEqual(obj[key], partial[key])
        ) {
            changed_keys.push(key);
        }
    }

    return changed_keys;
}

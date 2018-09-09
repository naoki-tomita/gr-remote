export function equals(obj1: any, obj2: any): boolean {
  if (typeof obj1 !== typeof obj2) {
    return false;
  }

  if (typeof obj1 === "undefined") {
    // obj is undefined.
    return true;
  } else if (typeof obj1 === "number") {
    // NaN === NaN is return false.
    if (Number.isNaN(obj1) && Number.isNaN(obj2)) {
      return true;
    }
    // obj is number.
    return obj1 === obj2;
  } else if (
    typeof obj1 === "string" ||
    typeof obj1 === "function" ||
    typeof obj1 === "symbol" ||
    typeof obj1 === "boolean" ||
    // typeof null === "object". but, Object.keys(null); throws Error.
    // so, if obj1 or obj2 is null then equal check by using "===".
    (obj1 === null || obj2 === null)
  ) {
    // obj is string, function, symbol, boolean, null.
    return obj1 === obj2;
  } else if (Array.isArray(obj1)) {
    // obj is array.
    return (
      obj1.length === obj2.length && obj1.every((o, i) => equals(o, obj2[i]))
    );
  } else if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime();
  }

  return (
    equals(Object.keys(obj1).sort(), Object.keys(obj2).sort()) &&
    Object.keys(obj1).every(k => equals(obj1[k], obj2[k]))
  );
}

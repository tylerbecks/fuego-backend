export function log(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const original = descriptor.value;

  descriptor.value = function <T>(...args: T[]) {
    console.log(
      `Calling ${propertyKey} ${args.length ? 'with' : 'no args'}`,
      ...args
    );
    const result = original.call(this, ...args);
    console.log('result: ', result);
    return result;
  };
}

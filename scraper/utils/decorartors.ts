export function log(
  target: unknown,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<(...args: unknown[]) => unknown>
) {
  const original = descriptor.value;

  descriptor.value = function (...args: unknown[]) {
    console.log(
      `Calling ${String(propertyKey)} ${args.length ? 'with' : 'no args'}`,
      ...args
    );
    if (original === undefined) {
      throw new Error('Original function is undefined');
    }
    const result = original.call(this, ...args);
    console.log('result: ', result);
    return result;
  };
}

export const asyncFilter = async <T>(
  arr: T[],
  callback: (arg: T) => Promise<boolean>
): Promise<T[]> => {
  const fail = Symbol();

  const mappedItems = await Promise.all(
    arr.map(async (item) => ((await callback(item)) ? item : fail))
  );

  return mappedItems.filter((i) => i !== fail) as T[];
};

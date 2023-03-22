export class GoToPageError extends Error {
  constructor(url = '', ...args: unknown[]) {
    super(url, ...args);
    this.message = `There was an error trying to load ${url}`;
  }
}

export class GoToPageError extends Error {
  constructor(url = '', options?: ErrorOptions) {
    super(url, options);
    this.message = `There was an error trying to load ${url}`;
  }
}

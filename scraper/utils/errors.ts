export class GoToPageError extends Error {
  constructor(url = '') {
    super(...arguments);
    this.message = `There was an error trying to load ${url}`;
  }
}

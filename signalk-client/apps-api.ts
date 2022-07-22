/** Signal K server Apps API */
export class SignalKApps {
  /** apps API endpoint. */
  public endpoint = '';

  /** Return List of installed apps. */
  async list() {
    const ep = this.endpoint.indexOf('webapps') === -1
      ? `${this.endpoint}list`
      : this.endpoint;
    const response = await fetch(ep);
    return response.json();
  }
}

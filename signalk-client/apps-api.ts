/** Signal K server Apps
 * ************************************/

export class SignalKApps {
  // ** apps api endpoint path
  public endpoint = "";

  // ** return List of installed apps
  async list() {
    const ep = this.endpoint.indexOf("webapps") == -1
      ? `${this.endpoint}list`
      : this.endpoint;
    const response = await fetch(ep);
    return response.json();
  }
}

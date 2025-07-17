export default class CreditView {
  constructor() {
    this.element = null;
  }

  render() {
    const element = document.createElement("div");
    element.innerHTML = `
      <h2>Credits</h2>
      <h3>Images</h3>
      <ul>
        <li>
          Back arrow icons created by
          <a
            href="https://www.flaticon.com/authors/wr-graphic-garage"
            title="WR Graphic Garage"
            >WR Graphic Garage - Flaticon</a
          >
        </li>
        <li>
          Next icons created by
          <a
            href="https://www.flaticon.com/free-icons/next"
            title="next icons"
          >
            WR Graphic Garage - Flaticon</a
            >
            </li>
            <li>
            X icons created by
            <a href="https://www.flaticon.com/free-icons/x" title="x icons"
                >Stockio - Flaticon</a
            >
            </li>
            <li>
            Fabric image by
            <a
                href="https://www.freepik.com/free-photo/pale-textile-template_1037273.htm#fromView=keyword&page=1&position=20&uuid=553540d9-457b-41d7-8e3d-478ea33e8930&query=Fabric+Texture"
                >kues1 on Freepik</a
            >
            </li>
            <li>
            Upload Vectors by
            <a href="https://www.vecteezy.com/free-vector/upload">Vecteezy</a>
            </li>
        </ul>
        <h3>Codes</h3>
        <ul>
            <li>
            Image URL verification by
            <a
                href="https://stackoverflow.com/a/68333175"
                title="Javascript Image Url Verify"
                >Caleb Taylor</a
            >
            </li>
            <li>Helps from Copilot are commented in the code</li>
            <li>
            Most documentations and comments were written with Copilot with the
            prompt "Add comments where necessary".
            </li>
            <li>
            Managing errors from Web API (error codes, messages, handling) was
            done with Copilot with prompt "send informational error codes and
            messages in response to faulty HTTP requests".
            </li>
        </ul>
    `;
    this.element = element;
    return element;
  }
}
